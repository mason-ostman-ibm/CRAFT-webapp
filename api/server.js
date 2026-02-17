// IMPORTANT: Instana must be imported FIRST before any other modules
import instana from './instana.js';

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import xlsx from 'xlsx';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import { spawn } from 'child_process';
import { instanaTrackingMiddleware, trackEvent, trackError } from './instana-middleware.js';

// Python service URL for Delta Tool
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:5000';
const PYTHON_SERVICE_PORT = process.env.PYTHON_SERVICE_PORT || '5000';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Store instana globally for middleware access
app.locals.instana = instana;
global.instana = instana;

// Enable CORS
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// Add Instana tracking middleware for all requests
app.use(instanaTrackingMiddleware);

// Serve static files from the React app build
app.use(express.static(path.join(__dirname, '../dist')));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760 // 10MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = (process.env.ALLOWED_FILE_TYPES || '.xlsx,.xls').split(',');
    const ext = path.extname(file.originalname).toLowerCase();

    console.log(`File filter - filename: ${file.originalname}, ext: ${ext}, allowed: ${allowedTypes}`);

    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`));
    }
  }
});

/* ========================================================================
 * WatsonX.ai Configuration
 * ===================================================================== */
const WATSON_URL = process.env.WATSON_URL || '';
const IBM_WATSONX_API_KEY = process.env.IBM_WATSONX_API_KEY || '';
const IBM_WATSONX_PROJECT_ID = process.env.IBM_WATSONX_PROJECT_ID || '';
const WATSON_TEXT_MODEL = process.env.WATSON_TEXT_MODEL || 'meta-llama/llama-3-3-70b-instruct';

/**
 * Get IAM token for WatsonX.ai authentication
 */
async function getIamToken() {
  try {
    const response = await fetch('https://iam.cloud.ibm.com/identity/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=${IBM_WATSONX_API_KEY}`
    });

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error getting IAM token:', error);
    trackError(error, { operation: 'get_iam_token' });
    throw error;
  }
}

/**
 * Call WatsonX.ai to generate answers for Excel questions
 */
async function callWatsonxAI(questions, context = '') {
  try {
    const token = await getIamToken();

    const prompt = `You are an AI assistant helping business leaders fill out Excel questionnaires.
Given the following questions, provide concise, professional answers suitable for executive-level reporting.

Context: ${context}

Questions:
${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Provide answers in JSON format as an array of objects with "question" and "answer" fields.`;

    // Construct full endpoint URL
    const watsonEndpoint = `${WATSON_URL}/ml/v1/text/chat?version=2023-05-29`;

    const response = await fetch(watsonEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        model_id: WATSON_TEXT_MODEL,
        project_id: IBM_WATSONX_PROJECT_ID,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        parameters: {
          max_tokens: 2000,
          temperature: 0.7
        }
      })
    });

    const data = await response.json();
    
    // Extract the response content
    const content = data.choices?.[0]?.message?.content || '';
    
    // Try to parse JSON from the response
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.warn('Could not parse JSON from WatsonX response, returning raw content');
    }
    
    return content;
  } catch (error) {
    console.error('Error calling WatsonX.ai:', error);
    trackError(error, { operation: 'watsonx_ai_call' });
    throw error;
  }
}

/* ========================================================================
 * API Endpoints
 * ===================================================================== */

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Excel AI Processor API Server is running',
    timestamp: new Date().toISOString()
  });
});

/**
 * Upload Excel file endpoint
 */
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    trackEvent('file_uploaded', {
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    // Read the Excel file
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Extract questions (assuming first column contains questions)
    const questions = data
      .filter(row => row[0] && typeof row[0] === 'string')
      .map((row, index) => ({
        question: row[0],
        answer: row[1] || '',
        row: index
      }));

    res.json({
      success: true,
      fileId: req.file.filename,
      filePath: req.file.path,
      originalName: req.file.originalname,
      questions: questions,
      totalQuestions: questions.length
    });

  } catch (error) {
    console.error('Error processing upload:', error);
    trackError(error, { operation: 'file_upload' });
    res.status(500).json({
      error: 'Failed to process file',
      message: error.message
    });
  }
});

/**
 * Process Excel file with AI endpoint
 */
app.post('/api/process', async (req, res) => {
  try {
    const { filePath, questions, context } = req.body;

    if (!filePath || !questions) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    trackEvent('ai_processing_started', {
      questionCount: questions.length,
      hasContext: !!context
    });

    // Extract question text
    const questionTexts = questions.map(q => q.question);

    let aiResponses;
    
    // Check if WatsonX credentials are configured
    if (!IBM_WATSONX_API_KEY || !IBM_WATSONX_PROJECT_ID) {
      console.warn('WatsonX credentials not configured, using mock responses');
      // Generate mock responses for demo
      aiResponses = questionTexts.map(question => ({
        question: question,
        answer: `[DEMO MODE] This is a sample AI-generated answer for: "${question}". Configure WatsonX.ai credentials in Settings to get real AI responses.`
      }));
    } else {
      // Call WatsonX.ai to generate answers
      aiResponses = await callWatsonxAI(questionTexts, context);
    }

    trackEvent('ai_processing_completed', {
      questionCount: questions.length,
      responseType: typeof aiResponses,
      isDemoMode: !IBM_WATSONX_API_KEY
    });

    res.json({
      success: true,
      answers: aiResponses,
      processedAt: new Date().toISOString(),
      isDemoMode: !IBM_WATSONX_API_KEY
    });

  } catch (error) {
    console.error('Error processing with AI:', error);
    trackError(error, { operation: 'ai_processing' });
    res.status(500).json({
      error: 'Failed to process with AI',
      message: error.message
    });
  }
});

/**
 * Generate new Excel file with answers endpoint
 */
app.post('/api/generate', async (req, res) => {
  try {
    const { originalFilePath, questions, answers } = req.body;

    if (!originalFilePath || !questions || !answers) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    trackEvent('file_generation_started', {
      questionCount: questions.length
    });

    // Read the original Excel file
    const workbook = xlsx.readFile(originalFilePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Update answers in the worksheet
    questions.forEach((q, index) => {
      const answer = Array.isArray(answers) ? answers[index]?.answer : answers;
      if (answer) {
        const cellAddress = xlsx.utils.encode_cell({ r: q.row, c: 1 });
        worksheet[cellAddress] = { t: 's', v: answer };
      }
    });

    // Generate new file
    const outputDir = path.join(__dirname, '../uploads');
    const outputFilename = `processed-${Date.now()}.xlsx`;
    const outputPath = path.join(outputDir, outputFilename);
    
    xlsx.writeFile(workbook, outputPath);

    trackEvent('file_generation_completed', {
      outputFilename
    });

    res.json({
      success: true,
      downloadUrl: `/api/download/${outputFilename}`,
      filename: outputFilename
    });

  } catch (error) {
    console.error('Error generating file:', error);
    trackError(error, { operation: 'file_generation' });
    res.status(500).json({ 
      error: 'Failed to generate file',
      message: error.message 
    });
  }
});

/**
 * Download processed file endpoint
 */
app.get('/api/download/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../uploads', filename);

    // Check if file exists
    await fs.access(filePath);

    trackEvent('file_downloaded', { filename });

    res.download(filePath, filename, (err) => {
      if (err) {
        console.error('Error downloading file:', err);
        trackError(err, { operation: 'file_download' });
      }
    });

  } catch (error) {
    console.error('Error downloading file:', error);
    trackError(error, { operation: 'file_download' });
    res.status(404).json({ 
      error: 'File not found',
      message: error.message 
    });
  }
});

/**
 * Validate answers endpoint
 */
app.post('/api/validate', async (req, res) => {
  try {
    const { questions, answers } = req.body;

    if (!questions || !answers) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    trackEvent('validation_started', {
      questionCount: questions.length
    });

    // Validation logic
    const validationResults = questions.map((q, index) => {
      const answer = Array.isArray(answers) ? answers[index]?.answer : '';
      
      return {
        question: q.question,
        answer: answer,
        isValid: answer && answer.trim().length > 0,
        isEmpty: !answer || answer.trim().length === 0,
        wordCount: answer ? answer.split(/\s+/).length : 0
      };
    });

    const totalValid = validationResults.filter(r => r.isValid).length;
    const totalInvalid = validationResults.filter(r => !r.isValid).length;

    trackEvent('validation_completed', {
      totalValid,
      totalInvalid
    });

    res.json({
      success: true,
      validationResults,
      summary: {
        total: questions.length,
        valid: totalValid,
        invalid: totalInvalid,
        completionRate: ((totalValid / questions.length) * 100).toFixed(2) + '%'
      }
    });

  } catch (error) {
    console.error('Error validating answers:', error);
    trackError(error, { operation: 'validation' });
    res.status(500).json({ 
      error: 'Failed to validate answers',
      message: error.message 
    });
  }
});

/**
 * Get user info from OAuth2 proxy headers
 */
app.get('/api/user', (req, res) => {
  try {
    const userEmail = req.headers['x-forwarded-email'] || req.headers['x-auth-request-email'];
    const userName = req.headers['x-forwarded-user'] || req.headers['x-auth-request-user'];
    
    // For development, provide mock user data
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    res.json({
      email: userEmail || (isDevelopment ? 'dev.user@ibm.com' : 'anonymous'),
      name: userName || (isDevelopment ? 'Development User' : 'Anonymous User'),
      authenticated: !!userEmail || isDevelopment
    });
  } catch (error) {
    console.error('Error getting user info:', error);
    res.status(500).json({
      error: 'Failed to get user info',
      email: 'dev.user@ibm.com',
      name: 'Development User',
      authenticated: true
    });
  }
});

/* ========================================================================
 * BYOK (Bring Your Own Key) Settings Endpoints
 * ===================================================================== */

/* ========================================================================
 * DELTA TOOL API ENDPOINTS - Proxy to Python Service
 * Questionnaire Delta Tool for intelligent answer reuse from prior years
 * ===================================================================== */

/**
 * Upload and ingest baseline questionnaire - Proxy to Python
 */
app.post('/api/delta/upload-baseline', upload.single('file'), async (req, res) => {
  try {
    console.log('Upload baseline request received');
    console.log('  File:', req.file);
    console.log('  Body:', req.body);

    if (!req.file) {
      console.error('No file in request');
      return res.status(400).json({ error: 'No file uploaded', success: false });
    }

    const { description } = req.body;
    const userEmail = req.headers['x-forwarded-email'] || req.headers['x-auth-request-email'] || 'dev.user@ibm.com';

    trackEvent('delta_baseline_upload_started', {
      filename: req.file.originalname,
      user: userEmail
    });

    // Forward to Python service using form-data with proper stream handling
    const FormData = (await import('form-data')).default;
    const formData = new FormData();
    
    // Use createReadStream but ensure proper handling
    formData.append('file', createReadStream(req.file.path), {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
      knownLength: req.file.size
    });
    formData.append('description', description || '');

    // Use form-data's submit method instead of fetch for better compatibility
    const options = {
      method: 'POST',
      host: new URL(PYTHON_SERVICE_URL).hostname,
      port: new URL(PYTHON_SERVICE_URL).port || 5000,
      path: '/delta/upload-baseline',
      headers: {
        ...formData.getHeaders(),
        'x-forwarded-email': userEmail
      }
    };

    const http = await import('http');
    
    const proxyRequest = new Promise((resolve, reject) => {
      const request = http.request(options, (response) => {
        let data = '';
        
        response.on('data', (chunk) => {
          data += chunk;
        });
        
        response.on('end', () => {
          try {
            const result = JSON.parse(data);
            resolve({ status: response.statusCode, data: result });
          } catch (e) {
            reject(new Error(`Failed to parse response: ${data}`));
          }
        });
      });
      
      request.on('error', (error) => {
        reject(error);
      });
      
      formData.pipe(request);
    });

    const { status, data: result } = await proxyRequest;

    if (status === 200 && result.success) {
      trackEvent('delta_baseline_upload_completed', {
        baseline_id: result.baseline_id,
        questions_ingested: result.questions_ingested
      });
      res.json(result);
    } else {
      const errorMsg = result.error || result.message || 'Python service error';
      console.error('Python service returned error:', errorMsg);
      return res.status(status || 500).json({
        error: errorMsg,
        success: false
      });
    }

  } catch (error) {
    console.error('Error uploading baseline:', error);
    trackError(error, { operation: 'delta_baseline_upload' });
    res.status(500).json({
      error: 'Failed to upload baseline',
      message: error.message,
      success: false
    });
  } finally {
    // Clean up uploaded file
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (err) {
        console.error('Failed to clean up uploaded file:', err);
      }
    }
  }
});

/**
 * Process current year questionnaire against baseline - Proxy to Python
 */
app.post('/api/delta/process', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { similarity_threshold, use_llm } = req.body;

    trackEvent('delta_processing_started', {
      filename: req.file.originalname,
      threshold: similarity_threshold,
      use_llm: use_llm
    });

    // Forward to Python service using form-data with proper stream handling
    const FormData = (await import('form-data')).default;
    const formData = new FormData();
    
    // Use createReadStream with proper options
    formData.append('file', createReadStream(req.file.path), {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
      knownLength: req.file.size
    });
    if (similarity_threshold) {
      formData.append('similarity_threshold', similarity_threshold);
    }
    if (use_llm !== undefined) {
      formData.append('use_llm', use_llm);
    }

    // Use form-data's submit method with http module for better compatibility
    const options = {
      method: 'POST',
      host: new URL(PYTHON_SERVICE_URL).hostname,
      port: new URL(PYTHON_SERVICE_URL).port || 5000,
      path: '/delta/process',
      headers: formData.getHeaders()
    };

    const http = await import('http');
    
    const proxyRequest = new Promise((resolve, reject) => {
      const request = http.request(options, (response) => {
        let data = '';
        
        response.on('data', (chunk) => {
          data += chunk;
        });
        
        response.on('end', () => {
          try {
            const result = JSON.parse(data);
            resolve({ status: response.statusCode, data: result });
          } catch (e) {
            reject(new Error(`Failed to parse response: ${data}`));
          }
        });
      });
      
      request.on('error', (error) => {
        reject(error);
      });
      
      formData.pipe(request);
    });

    const { status, data: result } = await proxyRequest;

    if (status === 200) {
      trackEvent('delta_processing_completed', {
        total_questions: result.processing_summary.total_questions,
        auto_answered: result.processing_summary.auto_answered,
        completion_rate: result.processing_summary.completion_rate
      });

      res.json({
        success: true,
        processing_summary: result.processing_summary,
        matches: result.matches,
        unmatched: result.unmatched,
        download_url: `/api/delta/download/${result.download_filename}`,
        download_filename: result.download_filename
      });
    } else {
      throw new Error(result.error || 'Python service error');
    }

  } catch (error) {
    console.error('Error processing delta:', error);
    trackError(error, { operation: 'delta_processing' });
    res.status(500).json({
      error: 'Failed to process delta',
      message: error.message
    });
  } finally {
    // Clean up uploaded file
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (err) {
        console.error('Failed to clean up uploaded file:', err);
      }
    }
  }
});

/**
 * Download processed delta file - Proxy to Python
 */
app.get('/api/delta/download/:filename', async (req, res) => {
  try {
    const { filename } = req.params;

    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }

    trackEvent('delta_file_downloaded', { filename });

    // Use http module to properly stream binary file from Python service
    const http = await import('http');
    const url = new URL(PYTHON_SERVICE_URL);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 5000,
      path: `/delta/download/${encodeURIComponent(filename)}`,
      method: 'GET'
    };

    const proxyRequest = http.request(options, (proxyResponse) => {
      if (proxyResponse.statusCode === 200) {
        // Set headers for file download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        // Stream the file from Python service to client
        proxyResponse.pipe(res);
      } else {
        // Handle error response
        let errorData = '';
        proxyResponse.on('data', (chunk) => {
          errorData += chunk;
        });
        proxyResponse.on('end', () => {
          try {
            const error = JSON.parse(errorData);
            res.status(proxyResponse.statusCode).json(error);
          } catch (e) {
            res.status(proxyResponse.statusCode).json({
              error: 'File not found',
              message: errorData
            });
          }
        });
      }
    });

    proxyRequest.on('error', (error) => {
      console.error('Error downloading delta file:', error);
      trackError(error, { operation: 'delta_file_download' });
      res.status(500).json({
        error: 'Failed to download file',
        message: error.message
      });
    });

    proxyRequest.end();

  } catch (error) {
    console.error('Error downloading delta file:', error);
    trackError(error, { operation: 'delta_file_download' });
    res.status(404).json({
      error: 'File not found',
      message: error.message
    });
  }
});

/**
 * Get detailed delta processing report
 */
app.get('/api/delta/report/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;
    
    // In a production system, this would retrieve stored report data
    // For now, return a placeholder response
    res.json({
      report_id: reportId,
      generated_at: new Date().toISOString(),
      message: 'Detailed report generation coming soon',
      note: 'Report data is included in the process response'
    });

  } catch (error) {
    console.error('Error getting delta report:', error);
    res.status(500).json({
      error: 'Failed to get report',
      message: error.message
    });
  }
});

/**
 * Get baseline information - Proxy to Python
 */
app.get('/api/delta/baseline-info', async (req, res) => {
  try {
    const response = await fetch(`${PYTHON_SERVICE_URL}/delta/baseline-info`);
    const result = await response.json();
    res.json(result);
  } catch (error) {
    console.error('Error getting baseline info:', error);
    res.status(500).json({
      error: 'Failed to get baseline info',
      message: error.message
    });
  }
});

/**
 * Clear the baseline - Proxy to Python
 */
app.delete('/api/delta/baseline', async (req, res) => {
  try {
    const userEmail = req.headers['x-forwarded-email'] || req.headers['x-auth-request-email'];

    if (!userEmail && process.env.NODE_ENV === 'production') {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    trackEvent('delta_baseline_cleared', { user: userEmail });

    const response = await fetch(`${PYTHON_SERVICE_URL}/delta/baseline`, {
      method: 'DELETE'
    });
    const result = await response.json();
    res.json(result);

  } catch (error) {
    console.error('Error clearing baseline:', error);
    trackError(error, { operation: 'delta_baseline_clear' });
    res.status(500).json({
      error: 'Failed to clear baseline',
      message: error.message
    });
  }
});

/**
 * Preview processed delta file - Proxy to Python
 */
app.get('/api/delta/preview/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const response = await fetch(`${PYTHON_SERVICE_URL}/delta/preview/${encodeURIComponent(filename)}`);
    const result = await response.json();
    res.status(response.status).json(result);
  } catch (error) {
    console.error('Error getting delta preview:', error);
    res.status(500).json({ error: 'Failed to get preview', message: error.message });
  }
});

/**
 * Check Delta Service status - Proxy to Python
 */
app.get('/api/delta/status', async (req, res) => {
  try {
    const response = await fetch(`${PYTHON_SERVICE_URL}/delta/status`);
    const result = await response.json();
    res.json(result);
  } catch (error) {
    res.json({
      available: false,
      service: 'Delta Tool',
      error: 'Python service not available'
    });
  }
});

/**
 * Process Excel with Python RAG service - returns JSON with preview + download_filename
 */
app.post('/api/python/process', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const context = req.body.context || '';

    const FormData = (await import('form-data')).default;
    const formData = new FormData();
    formData.append('file', createReadStream(req.file.path), {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
      knownLength: req.file.size
    });
    formData.append('context', context);

    const http = await import('http');
    const url = new URL(PYTHON_SERVICE_URL);

    const options = {
      method: 'POST',
      hostname: url.hostname,
      port: url.port || 5000,
      path: '/process',
      headers: formData.getHeaders()
    };

    await new Promise((resolve) => {
      const proxyReq = http.request(options, (proxyRes) => {
        let data = '';
        proxyRes.on('data', (chunk) => { data += chunk; });
        proxyRes.on('end', () => {
          try {
            const result = JSON.parse(data);
            if (result.success && result.download_filename) {
              result.download_url = `/api/python/download/${encodeURIComponent(result.download_filename)}`;
            }
            res.status(proxyRes.statusCode).json(result);
          } catch {
            res.status(proxyRes.statusCode).json({ error: data });
          }
          resolve();
        });
      });

      proxyReq.on('error', (error) => {
        trackError(error, { operation: 'python_process' });
        res.status(500).json({ error: error.message });
        resolve();
      });

      formData.pipe(proxyReq);
    });

  } catch (error) {
    console.error('Error proxying to Python process:', error);
    trackError(error, { operation: 'python_process' });
    res.status(500).json({ error: error.message });
  } finally {
    if (req.file?.path) {
      try { await fs.unlink(req.file.path); } catch {}
    }
  }
});

/**
 * Download processed Python file - streams from Python service
 */
app.get('/api/python/download/:filename', async (req, res) => {
  try {
    const { filename } = req.params;

    const http = await import('http');
    const url = new URL(PYTHON_SERVICE_URL);

    const options = {
      hostname: url.hostname,
      port: url.port || 5000,
      path: `/python/download/${encodeURIComponent(filename)}`,
      method: 'GET'
    };

    const proxyRequest = http.request(options, (proxyResponse) => {
      if (proxyResponse.statusCode === 200) {
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        proxyResponse.pipe(res);
      } else {
        let errorData = '';
        proxyResponse.on('data', (chunk) => { errorData += chunk; });
        proxyResponse.on('end', () => {
          try {
            res.status(proxyResponse.statusCode).json(JSON.parse(errorData));
          } catch {
            res.status(proxyResponse.statusCode).json({ error: 'File not found' });
          }
        });
      }
    });

    proxyRequest.on('error', (error) => {
      trackError(error, { operation: 'python_download' });
      res.status(500).json({ error: error.message });
    });

    proxyRequest.end();

  } catch (error) {
    console.error('Error downloading python file:', error);
    trackError(error, { operation: 'python_download' });
    res.status(500).json({ error: error.message });
  }
});

/* ========================================================================
 * SPA FALLBACK - Must be BEFORE error handling!
 * ===================================================================== */

// Serve React app for all other routes (SPA fallback)
app.get('*', (req, res) => {
  try {
    const indexPath = path.join(__dirname, '../dist/index.html');
    res.sendFile(indexPath);
  } catch (error) {
    // In development, dist folder might not exist yet
    res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Excel AI Processor</title>
        </head>
        <body>
          <h1>Excel AI Processor API Server</h1>
          <p>Backend is running on port ${PORT}</p>
          <p>Run <code>npm run dev</code> in another terminal to start the frontend.</p>
          <p>Or run <code>npm run dev:all</code> to start both services.</p>
        </body>
      </html>
    `);
  }
});

/* ========================================================================
 * PYTHON SERVICE MANAGEMENT
 * ===================================================================== */

let pythonProcess = null;

/**
 * Start Python Flask service as a child process
 */
function startPythonService() {
  const pythonServicePath = path.join(__dirname, 'python-service', 'flask_api.py');
  const pythonServiceDir = path.join(__dirname, 'python-service');
  
  console.log('🐍 Starting Python service...');
  console.log(`   Path: ${pythonServicePath}`);
  console.log(`   Port: ${PYTHON_SERVICE_PORT}`);
  
  // Check if Python service file exists
  try {
    const fs = require('fs');
    if (!fs.existsSync(pythonServicePath)) {
      console.warn('⚠️  Python service not found. Skipping Python service startup.');
      console.warn('   Some features (Delta Tool, RAG processing) will not be available.');
      return null;
    }
  } catch (error) {
    console.warn('⚠️  Could not check for Python service:', error.message);
    return null;
  }
  
  pythonProcess = spawn('python3', [pythonServicePath], {
    cwd: pythonServiceDir,
    env: {
      ...process.env,
      PYTHON_SERVICE_PORT: PYTHON_SERVICE_PORT,
      PYTHONUNBUFFERED: '1' // Ensure real-time output
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  
  pythonProcess.stdout.on('data', (data) => {
    const output = data.toString().trim();
    if (output) {
      console.log(`[Python] ${output}`);
    }
  });
  
  pythonProcess.stderr.on('data', (data) => {
    const output = data.toString().trim();
    if (output && !output.includes('WARNING')) {
      console.error(`[Python Error] ${output}`);
    }
  });
  
  pythonProcess.on('error', (error) => {
    console.error('❌ Failed to start Python service:', error.message);
    console.error('   Some features (Delta Tool, RAG processing) will not be available.');
  });
  
  pythonProcess.on('exit', (code, signal) => {
    if (code !== null && code !== 0) {
      console.error(`❌ Python service exited with code ${code}`);
    } else if (signal) {
      console.log(`🐍 Python service terminated by signal ${signal}`);
    }
    pythonProcess = null;
  });
  
  // Give Python service time to start
  setTimeout(() => {
    if (pythonProcess && !pythonProcess.killed) {
      console.log('✅ Python service started successfully');
    }
  }, 2000);
  
  return pythonProcess;
}

/**
 * Graceful shutdown handler
 */
function gracefulShutdown(signal) {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  
  if (pythonProcess && !pythonProcess.killed) {
    console.log('🐍 Stopping Python service...');
    pythonProcess.kill('SIGTERM');
    
    // Force kill after 5 seconds if not stopped
    setTimeout(() => {
      if (pythonProcess && !pythonProcess.killed) {
        console.log('🐍 Force stopping Python service...');
        pythonProcess.kill('SIGKILL');
      }
    }, 5000);
  }
  
  // Exit after cleanup
  setTimeout(() => {
    process.exit(0);
  }, 6000);
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

/* ========================================================================
 * START SERVER
 * ===================================================================== */

app.listen(PORT, () => {
  console.log(`🚀 Excel AI Processor API Server running on port ${PORT}`);
  console.log(`📊 Processing Excel files with WatsonX.ai`);
  console.log(`📈 Instana monitoring enabled`);
  console.log(`🌐 Serving frontend from /dist`);
  
  // Start Python service after Node.js server is ready
  startPythonService();
});

// Made with Bob

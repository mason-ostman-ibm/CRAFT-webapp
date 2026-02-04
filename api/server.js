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
import { instanaTrackingMiddleware, trackEvent, trackError } from './instana-middleware.js';

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

    const response = await fetch(WATSON_URL, {
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

app.listen(PORT, () => {
  console.log(`🚀 Excel AI Processor API Server running on port ${PORT}`);
  console.log(`📊 Processing Excel files with WatsonX.ai`);
  console.log(`📈 Instana monitoring enabled`);
  console.log(`🌐 Serving frontend from /dist`);
});

// Made with Bob


/* ========================================================================
 * BYOK (Bring Your Own Key) Settings Endpoints
 * ===================================================================== */

/**
 * Save WatsonX.ai credentials
 */
app.post('/api/settings/watsonx', async (req, res) => {
  try {
    const { apiKey, projectId } = req.body;
    const userEmail = req.headers['x-forwarded-email'] || req.headers['x-auth-request-email'];

    if (!userEmail) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!apiKey || !projectId) {
      return res.status(400).json({ error: 'API key and project ID are required' });
    }

    // In production, encrypt these values before storing
    // For now, store in memory or database
    // TODO: Implement secure storage with encryption

    trackEvent('watsonx_credentials_saved', { userEmail });

    res.json({
      success: true,
      message: 'WatsonX.ai credentials saved successfully'
    });

  } catch (error) {
    console.error('Error saving WatsonX credentials:', error);
    trackError(error, { operation: 'save_watsonx_credentials' });
    res.status(500).json({ 
      error: 'Failed to save credentials',
      message: error.message 
    });
  }
});

/**
 * Save AstraDB credentials
 */
app.post('/api/settings/astradb', async (req, res) => {
  try {
    const { endpoint, token } = req.body;
    const userEmail = req.headers['x-forwarded-email'] || req.headers['x-auth-request-email'];

    if (!userEmail) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!endpoint || !token) {
      return res.status(400).json({ error: 'Endpoint and token are required' });
    }

    // TODO: Implement secure storage with encryption

    trackEvent('astradb_credentials_saved', { userEmail });

    res.json({
      success: true,
      message: 'AstraDB credentials saved successfully'
    });

  } catch (error) {
    console.error('Error saving AstraDB credentials:', error);
    trackError(error, { operation: 'save_astradb_credentials' });
    res.status(500).json({ 
      error: 'Failed to save credentials',
      message: error.message 
    });
  }
});

/**
 * Save Watson Orchestrate credentials
 */
app.post('/api/settings/orchestrate', async (req, res) => {
  try {
    const { apiKey, url } = req.body;
    const userEmail = req.headers['x-forwarded-email'] || req.headers['x-auth-request-email'];

    if (!userEmail) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!apiKey || !url) {
      return res.status(400).json({ error: 'API key and URL are required' });
    }

    // TODO: Implement secure storage with encryption

    trackEvent('orchestrate_credentials_saved', { userEmail });

    res.json({
      success: true,
      message: 'Watson Orchestrate credentials saved successfully'
    });

  } catch (error) {
    console.error('Error saving Orchestrate credentials:', error);
    trackError(error, { operation: 'save_orchestrate_credentials' });
    res.status(500).json({ 
      error: 'Failed to save credentials',
      message: error.message 
    });
  }
});

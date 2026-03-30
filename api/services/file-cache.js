import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cache directory
const CACHE_DIR = '/tmp/downloads';

/**
 * Ensure cache directory exists
 */
export function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true, mode: 0o755 });
    console.log(`Created cache directory: ${CACHE_DIR}`);
  }
}

/**
 * Get cache file path for a job
 */
export function getCacheFilePath(jobId, filename = null) {
  if (filename) {
    return path.join(CACHE_DIR, filename);
  }
  return path.join(CACHE_DIR, `${jobId}.xlsx`);
}

/**
 * Check if file exists in cache
 */
export function isCached(jobId, filename = null) {
  const filePath = getCacheFilePath(jobId, filename);
  return fs.existsSync(filePath);
}

/**
 * Download file from Python service to cache
 * @param {string} pythonServiceUrl - Base URL of Python service
 * @param {string} jobId - Job ID
 * @param {string} downloadPath - Path to download endpoint (e.g., '/job/{jobId}/download')
 * @returns {Promise<{success: boolean, filePath?: string, filename?: string, error?: string}>}
 */
export async function downloadToCache(pythonServiceUrl, jobId, downloadPath) {
  return new Promise((resolve, reject) => {
    try {
      ensureCacheDir();

      const url = new URL(pythonServiceUrl);
      const httpModule = url.protocol === 'https:' ? https : http;

      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: downloadPath,
        method: 'GET'
      };

      const request = httpModule.request(options, (response) => {
        if (response.statusCode !== 200) {
          let errorData = '';
          response.on('data', (chunk) => { errorData += chunk; });
          response.on('end', () => {
            resolve({
              success: false,
              error: `Failed to download: ${response.statusCode} - ${errorData}`
            });
          });
          return;
        }

        // Extract filename from Content-Disposition header if available
        let filename = `${jobId}.xlsx`;
        const contentDisposition = response.headers['content-disposition'];
        if (contentDisposition) {
          const match = contentDisposition.match(/filename="?([^"]+)"?/);
          if (match && match[1]) {
            filename = match[1];
          }
        }

        const filePath = getCacheFilePath(jobId, filename);
        const writeStream = fs.createWriteStream(filePath);

        response.pipe(writeStream);

        writeStream.on('finish', () => {
          writeStream.close();
          console.log(`File cached successfully: ${filePath}`);
          resolve({
            success: true,
            filePath,
            filename
          });
        });

        writeStream.on('error', (error) => {
          fs.unlink(filePath, () => {}); // Clean up partial file
          resolve({
            success: false,
            error: `Write error: ${error.message}`
          });
        });
      });

      request.on('error', (error) => {
        resolve({
          success: false,
          error: `Request error: ${error.message}`
        });
      });

      request.end();

    } catch (error) {
      resolve({
        success: false,
        error: `Exception: ${error.message}`
      });
    }
  });
}

/**
 * Serve file from cache
 * @param {Response} res - Express response object
 * @param {string} jobId - Job ID
 * @param {string} filename - Optional specific filename
 */
export function serveCachedFile(res, jobId, filename = null) {
  const filePath = getCacheFilePath(jobId, filename);

  if (!fs.existsSync(filePath)) {
    return false; // File not in cache
  }

  const displayFilename = filename || `${jobId}.xlsx`;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${displayFilename}"`);
  
  const readStream = fs.createReadStream(filePath);
  readStream.pipe(res);
  
  readStream.on('error', (error) => {
    console.error('Error reading cached file:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to read cached file' });
    }
  });

  return true; // File served from cache
}

/**
 * Clean up old cached files (older than specified hours)
 * @param {number} maxAgeHours - Maximum age in hours (default: 24)
 */
export function cleanupOldFiles(maxAgeHours = 24) {
  try {
    ensureCacheDir();
    const files = fs.readdirSync(CACHE_DIR);
    const now = Date.now();
    const maxAge = maxAgeHours * 60 * 60 * 1000;
    let deletedCount = 0;

    files.forEach(file => {
      const filePath = path.join(CACHE_DIR, file);
      const stats = fs.statSync(filePath);
      const age = now - stats.mtimeMs;

      if (age > maxAge) {
        fs.unlinkSync(filePath);
        deletedCount++;
        console.log(`Deleted old cached file: ${file}`);
      }
    });

    if (deletedCount > 0) {
      console.log(`Cleanup complete: ${deletedCount} file(s) deleted`);
    }
  } catch (error) {
    console.error('Error during cache cleanup:', error);
  }
}

// Initialize cache directory on module load
ensureCacheDir();

// Made with Bob
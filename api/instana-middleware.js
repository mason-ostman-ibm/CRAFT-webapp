// Instana middleware for enhanced tracking and user journey monitoring

/**
 * Middleware to add custom tags and metadata to Instana traces
 * Tracks user journeys, file operations, and AI processing
 */
export function instanaTrackingMiddleware(req, res, next) {
  // Get current span from Instana
  const instana = req.app.locals.instana;
  
  if (instana && instana.currentSpan) {
    try {
      const span = instana.currentSpan();
      
      if (span && typeof span.setTag === 'function') {
        // Add custom tags for better trace filtering
        span.setTag('http.route', req.route?.path || req.path);
        span.setTag('http.method', req.method);
        
        // Track user information from OAuth2 proxy headers
        const userEmail = req.headers['x-forwarded-email'] || req.headers['x-auth-request-email'];
        const userName = req.headers['x-forwarded-user'] || req.headers['x-auth-request-user'];
        
        if (userEmail) {
          span.setTag('user.email', userEmail);
        }
        if (userName) {
          span.setTag('user.name', userName);
        }
        
        // Track file operations
        if (req.file) {
          span.setTag('file.name', req.file.originalname);
          span.setTag('file.size', req.file.size);
          span.setTag('file.mimetype', req.file.mimetype);
        }
        
        // Track AI processing requests
        if (req.path.includes('/process') || req.path.includes('/ai')) {
          span.setTag('operation.type', 'ai_processing');
        }
        
        // Track validation requests
        if (req.path.includes('/validate')) {
          span.setTag('operation.type', 'validation');
        }
      }
    } catch (error) {
      // Silently fail if Instana is not fully initialized
      // This prevents errors when Instana agent is not connected
    }
  }
  
  next();
}

/**
 * Track custom events in Instana
 * @param {string} eventName - Name of the event
 * @param {object} metadata - Additional metadata
 */
export function trackEvent(eventName, metadata = {}) {
  const instana = global.instana;
  
  if (instana && instana.currentSpan) {
    try {
      const span = instana.currentSpan();
      
      if (span && typeof span.log === 'function') {
        span.log({
          event: eventName,
          ...metadata,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      // Silently fail if Instana is not fully initialized
    }
  }
}

/**
 * Track errors in Instana
 * @param {Error} error - Error object
 * @param {object} context - Additional context
 */
export function trackError(error, context = {}) {
  const instana = global.instana;
  
  if (instana && instana.currentSpan) {
    try {
      const span = instana.currentSpan();
      
      if (span && typeof span.setTag === 'function' && typeof span.log === 'function') {
        span.setTag('error', true);
        span.log({
          event: 'error',
          'error.kind': error.name,
          'error.object': error,
          message: error.message,
          stack: error.stack,
          ...context
        });
      }
    } catch (error) {
      // Silently fail if Instana is not fully initialized
    }
  }
}

export default {
  instanaTrackingMiddleware,
  trackEvent,
  trackError
};

// Made with Bob

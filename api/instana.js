// IMPORTANT: This file must be imported FIRST in server.js before any other modules
// Instana automatic tracing for Node.js applications

import instana from '@instana/collector';

// Initialize Instana collector
instana({
  tracing: {
    enabled: true,
    automaticTracingEnabled: true,
    stackTraceLength: 10,
  },
  metrics: {
    transmissionDelay: 1000,
  },
});

console.log('✅ Instana collector initialized');

export default instana;

// Made with Bob

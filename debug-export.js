// Load environment variables
require('dotenv').config();

// Try to require the module
try {
  const generateCardModule = require('./api/generate-card');
  console.log('Module type:', typeof generateCardModule);
  console.log('Module is a function?', typeof generateCardModule === 'function');
  console.log('Module keys:', Object.keys(generateCardModule));
  console.log('Module prototype:', Object.getPrototypeOf(generateCardModule));
  
  // Check if it's a router
  if (generateCardModule && generateCardModule.stack) {
    console.log('Has stack property (likely a router)');
    console.log('Stack length:', generateCardModule.stack.length);
  } else {
    console.log('Does NOT have stack property (not a router)');
  }
} catch (error) {
  console.error('Error requiring module:', error);
}
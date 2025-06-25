try {
  const express = require('express');
  console.log('Express loaded:', !!express);
  
  // Create a simple router
  const router = express.Router();
  console.log('Router created:', !!router);
  console.log('Router type:', typeof router);
  console.log('Router has stack?', !!router.stack);
  
  // Add a simple route
  router.get('/test', (req, res) => {
    res.send('Test route works!');
  });
  
  // Export the router
  console.log('Router after adding route has stack?', !!router.stack);
  console.log('Router stack length:', router.stack ? router.stack.length : 'N/A');
  
  // Test module.exports
  const testExport = {};
  testExport.router = router;
  console.log('Test export type:', typeof testExport);
  console.log('Test export keys:', Object.keys(testExport));
  
} catch (error) {
  console.error('Error:', error);
}
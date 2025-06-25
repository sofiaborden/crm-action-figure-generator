const express = require('express');
const app = express();
const port = 3001;

// Import the router
const generateCardRouter = require('./api/minimal-generate-card');

// Log what we're importing
console.log('Router type:', typeof generateCardRouter);
console.log('Router has stack?', !!generateCardRouter.stack);

// Use the router
app.use('/api', generateCardRouter);

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Test the API at http://localhost:${port}/api/test`);
});
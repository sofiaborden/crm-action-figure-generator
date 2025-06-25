const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = 3001;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Import the router
const generateCardRouter = require('./api/openai-generate-card');

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
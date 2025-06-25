// Load environment variables
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Import the router
const generateCardRouter = require('./api/generate-card');

// Log what we're importing
console.log('Router type:', typeof generateCardRouter);
console.log('Router has stack?', !!generateCardRouter.stack);

// Use the router
app.use('/api', generateCardRouter);

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Visit http://localhost:${port} to access the application`);
  console.log(`Test the API at http://localhost:${port}/api/test`);
});

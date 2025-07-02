// Load environment variables
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 10000;

// Add error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Import the router
const generateCardRouter = require('./api/new-generate-card');

// Log what we're importing
console.log('Router type:', typeof generateCardRouter);
console.log('Router has stack?', !!generateCardRouter.stack);

// Use the router
app.use('/api', generateCardRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    port: port,
    env: {
      NODE_ENV: process.env.NODE_ENV,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'SET' : 'NOT_SET'
    }
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Visit http://localhost:${port} to access the application`);
  console.log(`Test the API at http://localhost:${port}/api/test`);
});

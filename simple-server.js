// Load environment variables
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Import the router directly
const router = require('./api/simple-generate-card');

// Use the router
app.use('/api', router);

// Start the server
app.listen(port, () => {
  console.log(`Simple server running on port ${port}`);
  console.log(`Visit http://localhost:${port} to access the application`);
  console.log(`Test the API at http://localhost:${port}/api/test`);
});

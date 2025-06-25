const express = require('express');
const app = express();

// Create a router
const router = express.Router();

// Add a route to the router
router.get('/test', (req, res) => {
  res.send('Test route works!');
});

// Use the router
app.use('/api', router);

// Start the server
app.listen(3000, () => {
  console.log('Server running on port 3000');
  console.log('Try accessing http://localhost:3000/api/test');
});

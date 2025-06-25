const express = require('express');
const router = express.Router();

// Simple test route
router.get('/test', (req, res) => {
  res.send('Minimal generate-card router is working!');
});

// Export the router
module.exports = router;
const express = require('express');
const router = express.Router();

// Define routes on the router
router.get('/example', (req, res) => {
  res.send('This is an example route');
});

// Export the router to use in your main app
module.exports = router;
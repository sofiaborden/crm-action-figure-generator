// Load environment variables
require('dotenv').config();

const express = require('express');
const router = express.Router();
const multer = require('multer');

// Configure multer for file uploads
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Simple test route
router.get('/test', (req, res) => {
  res.send('Router is working!');
});

// Generate card route
router.post('/generate-card', upload.single('image'), (req, res) => {
  try {
    const { role, painPoint, crmPersonality, email } = req.body;
    
    // For now, return mock data
    res.json({
      success: true,
      card: {
        title: "Test Persona",
        quote: "This is a test quote",
        imageUrl: "https://via.placeholder.com/300"
      }
    });
    
  } catch (error) {
    console.error('Error generating card:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate card',
      details: error.message
    });
  }
});

// Export the router - this must be the last line
module.exports = router;

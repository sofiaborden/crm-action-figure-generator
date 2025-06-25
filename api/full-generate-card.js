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

// Initialize OpenAI client
const OpenAI = require('openai');
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Simple test route
router.get('/test', (req, res) => {
  res.send('Full generate-card router is working!');
});

// Generate card route
router.post('/generate-card', upload.single('image'), async (req, res) => {
  try {
    const { role, painPoint, crmPersonality, email } = req.body;
    
    // Generate persona using GPT-4
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system", 
          content: "You create CRM personas in JSON format with title, quote, and visual_prompt fields."
        },
        {
          role: "user",
          content: `Create a CRM persona based on this role: ${role}, pain point: ${painPoint}, and personality: ${crmPersonality}`
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    // Parse the generated persona
    const personaText = completion.choices[0].message.content;
    let persona;
    try {
      persona = JSON.parse(personaText);
    } catch (error) {
      console.error('Failed to parse persona JSON:', error);
      persona = {
        title: "Parsing Error Persona",
        quote: "There was an error parsing the response",
        visual_prompt: "Error figure"
      };
    }
    
    // For now, return mock image URL (DALL-E integration can be added later)
    const imageUrl = "https://via.placeholder.com/300";
    
    // Return the generated card data
    res.json({
      success: true,
      card: {
        title: persona.title,
        quote: persona.quote,
        imageUrl
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

// Export the router
module.exports = router;
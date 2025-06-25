// Load environment variables
require('dotenv').config();

const express = require('express');
const router = express.Router();

// Initialize OpenAI client
const OpenAI = require('openai');
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Simple test route
router.get('/test', (req, res) => {
  res.send('OpenAI generate-card router is working!');
});

// Generate card route
router.post('/generate-card', async (req, res) => {
  try {
    const { role, painPoint, crmPersonality } = req.body;
    
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

    // Return a simple response for now
    res.json({
      success: true,
      message: "OpenAI integration is working!",
      response: completion.choices[0].message.content
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
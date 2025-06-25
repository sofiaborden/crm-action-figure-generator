// Load environment variables
require('dotenv').config();

const express = require('express');
const router = express.Router();
const multer = require('multer');

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Initialize OpenAI client
const OpenAI = require('openai');
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Simple test route
router.get('/test', (req, res) => {
  res.send('Simple router is working!');
});

// Generate card route
router.post('/generate-card', upload.single('image'), async (req, res) => {
  try {
    console.log('Received request:', req.body);
    const { role, painPoint, crmPersonality, email } = req.body;
    
    if (!role || !painPoint || !crmPersonality || !email) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    
    // Generate persona using GPT-4
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system", 
          content: "You create CRM personas with a title and quote."
        },
        {
          role: "user",
          content: `Create a CRM persona based on this role: ${role}, pain point: ${painPoint}, and personality: ${crmPersonality}. Respond with a JSON object that has a 'title' and 'quote' field.`
        }
      ],
      temperature: 0.7,
      max_tokens: 300,
      response_format: { type: "json_object" }
    });

    // Parse the generated persona
    const personaText = completion.choices[0].message.content;
    console.log('OpenAI response:', personaText);
    
    let persona;
    try {
      persona = JSON.parse(personaText);
    } catch (error) {
      console.error('Failed to parse persona JSON:', error);
      persona = {
        title: `${crmPersonality} ${role}`,
        quote: painPoint
      };
    }
    
    // Return the generated card data with a placeholder image
    res.json({
      success: true,
      card: {
        title: persona.title,
        quote: persona.quote,
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

// Export the router
module.exports = router;
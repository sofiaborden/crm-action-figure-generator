// Load environment variables
require('dotenv').config();

const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const csvWriter = require('csv-writer').createObjectCsvWriter;

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Initialize OpenAI client
const OpenAI = require('openai');
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Setup CSV writer for logging
const writer = csvWriter({
  path: 'submissions.csv',
  header: [
    {id: 'timestamp', title: 'TIMESTAMP'},
    {id: 'email', title: 'EMAIL'},
    {id: 'role', title: 'ROLE'},
    {id: 'painPoint', title: 'PAIN_POINT'},
    {id: 'crmPersonality', title: 'CRM_PERSONALITY'},
    {id: 'title', title: 'GENERATED_TITLE'},
    {id: 'quote', title: 'GENERATED_QUOTE'}
  ],
  append: true
});

// Simple test route
router.get('/test', (req, res) => {
  res.send('Router is working!');
});

// Helper function to process uploaded image if available
async function processUploadedImage(file) {
  if (!file) return null;
  
  try {
    // Read the file as base64
    const imageBuffer = fs.readFileSync(file.path);
    const base64Image = imageBuffer.toString('base64');
    
    // You could use this base64 image with OpenAI's API if needed
    // For now, we'll just return the file path
    return {
      path: file.path,
      base64: base64Image
    };
  } catch (error) {
    console.error('Error processing uploaded image:', error);
    return null;
  }
}

// Generate image using DALL-E with the detailed prompt and retry logic
async function generateDallEImage(prompt, retries = 3) {
  let attempt = 0;
  let imageUrl = "https://via.placeholder.com/300";
  
  while (attempt < retries) {
    try {
      console.log(`DALL-E attempt ${attempt + 1} of ${retries}...`);
      
      // Simplify the prompt if we're on a retry
      const currentPrompt = attempt > 0 
        ? `Photorealistic 3D render of a toy action figure in clear plastic blister packaging labeled "Julep Confessionals". Studio lighting, product photography, highly detailed.` 
        : prompt;
      
      const imageResponse = await openai.images.generate({
        model: "dall-e-3",
        prompt: currentPrompt,
        n: 1,
        size: "1024x1024",
        quality: "hd",
        style: "vivid",
        response_format: "url"
      });
      
      imageUrl = imageResponse.data[0].url;
      console.log('Generated image URL:', imageUrl);
      return imageUrl;
    } catch (imageError) {
      attempt++;
      console.error(`DALL-E attempt ${attempt} failed:`, imageError.message);
      
      // If we have more retries, wait a bit before trying again
      if (attempt < retries) {
        console.log(`Waiting before retry ${attempt + 1}...`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      } else {
        console.error('All DALL-E attempts failed. Using placeholder image.');
        return imageUrl;
      }
    }
  }
  
  return imageUrl;
}

// Generate card route
router.post('/generate-card', upload.single('image'), async (req, res) => {
  try {
    console.log('Received request:', req.body);
    const { role, painPoint, crmPersonality, email } = req.body;
    const uploadedImage = req.file ? await processUploadedImage(req.file) : null;
    
    if (!role || !painPoint || !crmPersonality || !email) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    
    console.log('Generating persona with OpenAI...');
    
    // Generate persona using GPT-3.5-turbo
    let completion;
    try {
      completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system", 
            content: "You create fun, creative CRM action figure personas in JSON format with title, quote, and visual_prompt fields. Be playful and imaginative - these are action figures! The title should be a superhero-like name that incorporates their role and personality. The quote should be a catchy one-liner that sounds like something an action figure would say. The visual_prompt should describe a detailed, colorful action figure with accessories and a dynamic pose."
          },
          {
            role: "user",
            content: `Create a CRM action figure persona based on this role: ${role}, pain point: ${painPoint}, and personality: ${crmPersonality}. Make it fun, creative and memorable - like a real action figure character!`
          }
        ],
        temperature: 0.8,
        max_tokens: 500,
        response_format: { type: "json_object" }
      });
      console.log('OpenAI completion response received');
    } catch (openaiError) {
      console.error('OpenAI API error:', openaiError);
      return res.status(500).json({
        success: false,
        error: 'Failed to generate persona with OpenAI',
        details: openaiError.message
      });
    }

    // Parse the generated persona
    const personaText = completion.choices[0].message.content;
    console.log('OpenAI response:', personaText);
    
    let persona;
    try {
      persona = JSON.parse(personaText);
      console.log('Successfully parsed persona JSON');
    } catch (parseError) {
      console.error('Failed to parse persona JSON:', parseError);
      console.error('Raw response:', personaText);
      persona = {
        title: `Captain ${crmPersonality}`,
        quote: `I'll solve your ${painPoint} problems with my ${crmPersonality} powers!`,
        visual_prompt: `A colorful action figure of a ${role} superhero with ${crmPersonality} themed costume and accessories.`
      };
    }
    
    console.log('Parsed persona:', persona);
    
    // Generate a detailed DALL-E prompt using GPT
    console.log('Generating detailed DALL-E prompt...');
    let dallePrompt;

    try {
      const promptCompletion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system", 
            content: `You are an expert at creating detailed, creative prompts for DALL-E image generation. 
            You specialize in creating prompts that generate high-quality, photorealistic 3D renders of action figures in vintage packaging.
            Your prompts consistently produce images that look like professional product photography of actual toys.`
          },
          {
            role: "user",
            content: `Create a DALL-E prompt for a satirical CRM action figure based on:
            
            Title: "${persona.title}"
            Role: ${role}
            Pain Point: ${painPoint}
            Personality: ${crmPersonality}
            Quote: "${persona.quote}"
            
            The prompt should describe a photorealistic 3D render of a CRM-themed toy action figure in vintage blister packaging labeled "Julep Confessionals".
            
            IMPORTANT PROMPT GUIDELINES:
            1. Start with "Photorealistic 3D render of a toy action figure in packaging"
            2. Describe the figure as a professional product photo of a toy on store shelves
            3. Mention "clear plastic blister packaging with cardboard backing"
            4. Include specific details about the figure's pose, accessories, and expression
            5. Describe the packaging design with "Julep Confessionals" logo at the top
            6. Mention the quote appearing on a speech bubble on the packaging
            7. End with "studio lighting, product photography, highly detailed"
            8. Keep the prompt under 400 characters
            9. DO NOT use quotation marks in your prompt`
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      });
      
      dallePrompt = promptCompletion.choices[0].message.content;
      console.log('Generated DALL-E prompt:', dallePrompt);
    } catch (promptError) {
      console.error('Error generating DALL-E prompt:', promptError);
      dallePrompt = `Photorealistic 3D render of a toy action figure called "${persona.title}" in clear plastic blister packaging with cardboard backing labeled "Julep Confessionals". The figure represents a ${role} with ${crmPersonality} personality. Packaging includes the quote "${persona.quote}". Studio lighting, product photography, highly detailed.`;
    }
    
    // Generate image using DALL-E with the detailed prompt and retry logic
    console.log('Generating image with DALL-E...');
    const imageUrl = await generateDallEImage(dallePrompt);
    
    // Log submission to CSV
    try {
      await writer.writeRecords([{
        timestamp: new Date().toISOString(),
        email,
        role,
        painPoint,
        crmPersonality,
        title: persona.title,
        quote: persona.quote
      }]);
      console.log('Submission logged to CSV');
    } catch (csvError) {
      console.error('Error logging to CSV:', csvError);
      // Continue despite CSV error
    }
    
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
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate card',
      details: error.message
    });
  }
});

// Export the router
module.exports = router;

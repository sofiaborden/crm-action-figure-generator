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
  res.send('GPT Router is working!');
});

// Helper function to process uploaded image if available
async function processUploadedImage(file) {
  if (!file) return null;
  
  try {
    // Read the file as base64
    const imageBuffer = fs.readFileSync(file.path);
    const base64Image = imageBuffer.toString('base64');
    
    return {
      path: file.path,
      base64: `data:image/${path.extname(file.originalname).substring(1)};base64,${base64Image}`
    };
  } catch (error) {
    console.error('Error processing uploaded image:', error);
    return null;
  }
}

// Generate card route using GPT to handle the entire process
router.post('/generate-card', upload.single('image'), async (req, res) => {
  try {
    console.log('Received request:', req.body);
    const { role, painPoint, crmPersonality, email, useGptImage } = req.body;
    const uploadedImage = req.file ? await processUploadedImage(req.file) : null;
    
    if (!role || !painPoint || !crmPersonality || !email) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    
    console.log('Generating card with GPT...');
    
    // First, generate the persona content
    let generatedContent;
    try {
      // Generate persona with specific JSON structure
      const personaCompletion = await openai.chat.completions.create({
        model: uploadedImage ? "gpt-4o" : "gpt-4",
        messages: [
          {
            role: "system", 
            content: `You are an expert at creating satirical CRM-themed action figures. 
            You create memorable, funny personas based on CRM roles and pain points.
            Your output must be valid JSON with title, role, quote, accessories, and description fields.`
          },
          {
            role: "user",
            content: `Create a character for a satirical CRM-themed action figure based on:
            
            Role: ${role}
            Pain Point: ${painPoint}
            Personality Type: ${crmPersonality}
            
            The title should be a catchy, memorable name like "The Duplicator" or "The Data Dynamo" that reflects their personality type.
            
            The quote should be a funny, ironic line that would appear on packaging, like "You sent the Giving Tuesday email... on THANKSGIVING!"
            
            Accessories should be 2-3 symbolic items that represent their CRM struggles (e.g., an overflowing inbox, a broken dashboard, duplicate contact lists).
            
            Output JSON with these fields:
            title: The character name (based on personality type)
            role: Their CRM role (make it action-figure worthy)
            quote: A funny quote for the packaging
            accessories: List of 2-3 themed accessories
            description: Brief character description`
          },
          ...(uploadedImage ? [{
            role: "user",
            content: [
              {
                type: "text",
                text: "Here's a photo of the person who should be represented as an action figure. Note their physical appearance (hair color/style, skin tone, facial features, clothing style, etc.) for later use in the image generation."
              },
              {
                type: "image_url",
                image_url: {
                  url: uploadedImage.base64
                }
              }
            ]
          }] : [])
        ],
        temperature: 0.7,
        max_tokens: 1000,
        response_format: { type: "json_object" } // Force JSON response format
      });
      
      // Parse the generated content
      const responseText = personaCompletion.choices[0].message.content.trim();
      console.log('Raw persona response:', responseText);
      
      generatedContent = JSON.parse(responseText);
      console.log('Parsed persona content:', generatedContent);
      
    } catch (personaError) {
      console.error('Error generating persona:', personaError);
      // Create a fallback response
      generatedContent = {
        title: `The ${crmPersonality} ${role.split(' ')[0]}`,
        role: `${crmPersonality} ${role}`,
        quote: `I'll solve your ${painPoint} problems with ${crmPersonality} power!`,
        accessories: ["Laptop", "Dashboard", "Coffee Mug"],
        description: `An action figure based on a ${role} who tackles CRM challenges with a ${crmPersonality} approach.`
      };
    }
    
    // Generate image based on the selected method
    console.log('Generating image...');
    let imageUrl = "https://via.placeholder.com/300";

    if (useGptImage === 'true') {
      // Use a placeholder image with the title text
      console.log('Using GPT placeholder image...');
      
      // Create a more descriptive placeholder URL
      const encodedTitle = encodeURIComponent(generatedContent.title);
      const encodedRole = encodeURIComponent(generatedContent.role);
      
      // Use a better placeholder service that allows for more customization
      imageUrl = `https://placehold.co/600x800/32859a/FFFFFF?text=${encodedTitle}%0A${encodedRole}%20Action%20Figure`;
      console.log('Generated placeholder image URL:', imageUrl);
    } else {
      // Create a highly structured DALL-E prompt
      console.log('Creating structured DALL-E prompt...');
      
      // Define a base prompt template with placeholders
      const basePrompt = `Create a collectible action figure packaging image titled "JULEP CONFESSIONALS" at the top in white text, and "{{TITLE}}" in large bold white letters across the front. Use the visual style of 90s action figure toy packaging with visible blister plastic and strong edge lighting on a teal blue (#32859a) background. 

The figure should {{APPEARANCE}} and wear clothing that fits the "{{ROLE}}" role. Their facial expression and pose should reflect the CRM pain point: "{{PAIN_POINT}}".

Include {{ACCESSORIES}} as symbolic accessory items based on their CRM struggle.

The packaging should have a clean plastic overlay, and a collectible-style card at the bottom right with this quote: "{{QUOTE}}"

Make the whole image look realistic, professional, and marketing-ready, with soft shadows, packaging reflections, and no extra text like "ages 13+" or duplicated slogans. Only use "JULEP CONFESSIONALS" at the top, and "{{TITLE}}" as the title.`;
      
      // Create the appearance description based on uploaded image or generic description
      let appearanceDesc = "";
      if (uploadedImage) {
        // Get a detailed physical description from GPT if we have an uploaded image
        try {
          const descriptionCompletion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: "You analyze photos of people and provide detailed, accurate descriptions for image generation. Focus on gender, age range, skin tone, hair color/style/length, facial features, and any distinctive characteristics like glasses or jewelry. Be specific and objective."
              },
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "Describe this person in detail for creating an action figure that closely resembles them. Include gender, approximate age, skin tone, hair color/style/length, facial features, and any distinctive characteristics. Be specific and accurate."
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: uploadedImage.base64
                    }
                  }
                ]
              }
            ],
            temperature: 0.3,
            max_tokens: 200
          });
          
          const personDescription = descriptionCompletion.choices[0].message.content.trim();
          console.log('Person description:', personDescription);
          
          // Create a more specific appearance description for the action figure
          appearanceDesc = `be a stylized plastic action figure that closely resembles ${personDescription}. The figure should maintain the person's distinctive features while being stylized as a collectible toy`;
        } catch (descError) {
          console.error('Error getting appearance description:', descError);
          appearanceDesc = "be a stylized plastic action figure with generic features";
        }
      } else {
        appearanceDesc = `be a stylized plastic action figure representing a ${crmPersonality} ${role}`;
      }

      // Format accessories as a readable string
      const accessoriesStr = generatedContent.accessories.length > 0 
        ? generatedContent.accessories.join(", ").replace(/,([^,]*)$/, ' and$1')
        : "a laptop, a dashboard, and a coffee mug";
      
      // Generate image with DALL-E with stronger emphasis on resemblance
      try {
        // Create a more specific prompt that emphasizes resemblance to the uploaded image
        let dallePrompt;
        
        if (uploadedImage) {
          // For uploaded images, create a two-step process
          // First, get a more detailed prompt specifically for creating a figure that resembles the person
          const resemblancePrompt = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: "You create detailed DALL-E prompts that help generate images of action figures that closely resemble specific people."
              },
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: `I need to create an action figure that looks like this person. The action figure will be in packaging labeled "JULEP CONFESSIONALS" with "${generatedContent.title.toUpperCase()}" as the character name. The figure should clearly resemble this person while being stylized as a plastic toy. Create a detailed prompt section specifically about making the figure resemble this person.`
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: uploadedImage.base64
                    }
                  }
                ]
              }
            ],
            temperature: 0.5,
            max_tokens: 300
          });
          
          const resemblanceDescription = resemblancePrompt.choices[0].message.content.trim();
          console.log('Resemblance description:', resemblanceDescription);
          
          // Now create the full DALL-E prompt with the specialized resemblance section
          dallePrompt = `Create a collectible action figure packaging image titled "JULEP CONFESSIONALS" at the top in white text, and "${generatedContent.title.toUpperCase()}" in large bold white letters across the front. Use the visual style of 90s action figure toy packaging with visible blister plastic and strong edge lighting on a teal blue (#32859a) background.

${resemblanceDescription}

The figure should wear clothing that fits the "${generatedContent.role || role}" role and have a facial expression that reflects dealing with the CRM pain point: "${painPoint}".

Include ${accessoriesStr} as symbolic accessory items based on their CRM struggle.

The packaging should have a clean plastic overlay, and a collectible-style card at the bottom right with this quote: "${generatedContent.quote}"

Make the whole image look realistic, professional, and marketing-ready, with soft shadows, packaging reflections, and no extra text like "ages 13+" or duplicated slogans. Only use "JULEP CONFESSIONALS" at the top, and "${generatedContent.title.toUpperCase()}" as the title.`;
        } else {
          // Use the original template approach for non-image cases
          dallePrompt = finalPrompt;
        }
        
        console.log('Final DALL-E prompt:', dallePrompt);
        
        const imageResponse = await openai.images.generate({
          model: "dall-e-3",
          prompt: dallePrompt,
          n: 1,
          size: "1024x1024",
          quality: "hd",
          style: "vivid",
          response_format: "url"
        });
        
        imageUrl = imageResponse.data[0].url;
        console.log('Generated image URL with DALL-E:', imageUrl);
        
        // If there's a revised prompt, log it
        if (imageResponse.data[0].revised_prompt) {
          console.log('DALL-E revised prompt:', imageResponse.data[0].revised_prompt);
        }
      } catch (imageError) {
        console.error('Error generating image with DALL-E:', imageError);
        
        // Try with a simplified prompt as fallback
        try {
          // Even in fallback, try to maintain resemblance if image was uploaded
          let fallbackPrompt;
          if (uploadedImage) {
            fallbackPrompt = `A collectible action figure in clear plastic packaging with teal blue (#32859a) cardboard backing. The packaging has "JULEP CONFESSIONALS" in white text at the top and "${generatedContent.title.toUpperCase()}" displayed prominently. The action figure should resemble a ${appearanceDesc.includes('female') ? 'female' : 'person'} with ${appearanceDesc.includes('long hair') ? 'long hair' : 'distinctive features'} and represent a ${role}. Clean, professional product photography with studio lighting.`;
          } else {
            fallbackPrompt = `A collectible action figure in clear plastic packaging with teal blue (#32859a) cardboard backing. The packaging has "JULEP CONFESSIONALS" in white text at the top and "${generatedContent.title.toUpperCase()}" displayed prominently. The figure represents a ${role}. Clean, professional product photography with studio lighting.`;
          }
          
          const fallbackResponse = await openai.images.generate({
            model: "dall-e-3",
            prompt: fallbackPrompt,
            n: 1,
            size: "1024x1024",
            quality: "hd",
            style: "vivid",
            response_format: "url"
          });
          
          imageUrl = fallbackResponse.data[0].url;
          console.log('Generated image URL with DALL-E (fallback):', imageUrl);
        } catch (fallbackError) {
          console.error('Error generating image with DALL-E (fallback):', fallbackError);
          // Continue with placeholder image
        }
      }
    }
    
    // Log submission to CSV
    try {
      await writer.writeRecords([{
        timestamp: new Date().toISOString(),
        email,
        role,
        painPoint,
        crmPersonality,
        title: generatedContent.title,
        quote: generatedContent.quote
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
        title: generatedContent.title,
        quote: generatedContent.quote,
        description: generatedContent.description || "",
        accessories: generatedContent.accessories || [],
        role: generatedContent.role || role,
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

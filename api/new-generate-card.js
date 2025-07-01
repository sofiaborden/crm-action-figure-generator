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

// Systematic Accessory Mapping System
const ACCESSORY_MAPPINGS = {
  roles: {
    'Development Director': 'large fundraising goal thermometer with dollar amounts',
    'Fundraising Manager': 'donation box',
    'Donor Relations Manager': 'thank you card',
    'Grant Writer': 'stack of grant applications',
    'Program Manager': 'project timeline chart',
    'Executive Director': 'strategic plan document',
    'Communications Manager': 'megaphone',
    'Volunteer Coordinator': 'volunteer badge',
    'Database Administrator': 'computer server',
    'Development Associate': 'donor database printout',
    'Major Gifts Officer': 'handshake gesture',
    'Event Coordinator': 'event planning checklist',
    'Other': 'briefcase'
  },
  personalities: {
    'Micromanager': 'magnifying glass',
    'Data Hoarder': 'filing cabinet',
    'Tech Avoider': 'paper and pen',
    'Process Obsessed': 'flowchart diagram',
    'Relationship Builder': 'networking business cards',
    'Efficiency Expert': 'stopwatch',
    'Dashboard Addict': 'computer monitor with charts',
    'Automation Enthusiast': 'robot assistant',
    'Reluctant User': 'help manual',
    'Other': 'question mark sign'
  },
  painPoints: {
    'Data entry takes forever': 'keyboard with tired hands',
    'Too many clicks to do simple tasks': 'computer mouse with click counter',
    'Reports are confusing': 'tangled chart papers',
    'Integration issues': 'broken puzzle pieces',
    'User adoption problems': 'training manual',
    'Duplicate data everywhere': 'copy machine',
    'Mobile app is terrible': 'cracked smartphone',
    'Customization is too complex': 'complicated toolbox',
    'Poor customer support': 'disconnected phone',
    'Expensive pricing': 'money bag with hole',
    'Other': 'coffee mug with sad face emoji'
  }
};

// Function to get specific accessories based on form selections
function getSystematicAccessories(role, personality, painPoint, bonusAccessory) {
  const accessories = [];

  // Add role-based accessory
  if (ACCESSORY_MAPPINGS.roles[role]) {
    accessories.push(ACCESSORY_MAPPINGS.roles[role]);
  }

  // Add personality-based accessory
  if (ACCESSORY_MAPPINGS.personalities[personality]) {
    accessories.push(ACCESSORY_MAPPINGS.personalities[personality]);
  }

  // Add pain point accessory (only if different from others)
  const painPointAccessory = ACCESSORY_MAPPINGS.painPoints[painPoint];
  if (painPointAccessory && !accessories.includes(painPointAccessory)) {
    accessories.push(painPointAccessory);
  }

  // Add bonus accessory (filter null/undefined cleanly)
  if (bonusAccessory &&
      bonusAccessory !== 'none' &&
      bonusAccessory !== '' &&
      bonusAccessory !== null &&
      bonusAccessory !== undefined &&
      bonusAccessory.trim() !== '') {
    accessories.push(bonusAccessory.toLowerCase().trim());
  }

  return accessories.slice(0, 4); // Max 4 accessories
}

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
    {id: 'genderPreference', title: 'DETECTED_GENDER'},
    {id: 'bonusAccessory', title: 'BONUS_ACCESSORY'},
    {id: 'title', title: 'GENERATED_TITLE'},
    {id: 'quote', title: 'GENERATED_QUOTE'}
  ],
  append: true
});

// Simple test route
router.get('/test', (req, res) => {
  res.send('Router is working!');
});



// Helper function to process uploaded image and analyze it with OpenAI Vision
async function processUploadedImage(file) {
  if (!file) return null;

  try {
    // Read the file as base64
    const imageBuffer = fs.readFileSync(file.path);
    const base64Image = imageBuffer.toString('base64');

    // Use OpenAI Vision to analyze the uploaded photo
    console.log('Analyzing uploaded photo with OpenAI Vision...');
    const visionResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "I'm creating a custom action figure toy. Please describe the visual elements in this image that would be relevant for toy design: hair style and color, clothing style, apparent gender presentation (male/female/ambiguous), and general visual characteristics. Focus on design elements only, not personal identification. IMPORTANT: First specify how many people are clearly visible in the image. Start your response with 'People count: [number]' then 'Gender: [male/female/ambiguous]' then describe other visual elements. If multiple people are shown, describe each person separately."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${file.mimetype};base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 300
    });

    const photoDescription = visionResponse.choices[0].message.content;
    console.log('Photo analysis:', photoDescription);

    // Extract gender from the analysis
    let detectedGender = 'ambiguous';
    if (photoDescription.toLowerCase().includes('gender: male')) {
      detectedGender = 'male';
    } else if (photoDescription.toLowerCase().includes('gender: female')) {
      detectedGender = 'female';
    }

    return {
      path: file.path,
      base64: base64Image,
      description: photoDescription,
      detectedGender: detectedGender
    };
  } catch (error) {
    console.error('Error processing uploaded image:', error);
    // Return basic info if vision analysis fails
    try {
      const imageBuffer = fs.readFileSync(file.path);
      const base64Image = imageBuffer.toString('base64');
      return {
        path: file.path,
        base64: base64Image,
        description: "Professional person"
      };
    } catch (fileError) {
      console.error('Error reading file:', fileError);
      return {
        path: file.path,
        base64: null,
        description: "Professional person"
      };
    }
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
    const { role, painPoint, crmPersonality, email, bonusAccessory, customPainPoint, customAccessory } = req.body;
    const uploadedImage = req.file ? await processUploadedImage(req.file) : null;

    // Use detected gender from image analysis, or default to ambiguous
    const genderPreference = uploadedImage?.detectedGender || 'ambiguous';

    // Handle custom fields
    const finalPainPoint = painPoint === 'Other' ? customPainPoint : painPoint;
    const finalBonusAccessory = bonusAccessory === 'Other' ? customAccessory : bonusAccessory;

    // Debug log for bonus accessory
    console.log('🎯 BONUS ACCESSORY DEBUG:', {
      originalBonusAccessory: bonusAccessory,
      customAccessory: customAccessory,
      finalBonusAccessory: finalBonusAccessory,
      willIncludeInPrompt: !!finalBonusAccessory
    });

    if (!role || !finalPainPoint || !crmPersonality || !email) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    
    console.log('Generating persona with OpenAI...');
    
    // Generate persona using GPT-3.5-turbo
    let completion;
    try {
      // Create the user prompt with optional photo description
      let userPrompt = `Create a CRM action figure persona based on this role: ${role}, pain point: ${finalPainPoint}, personality: ${crmPersonality}, and gender preference: ${genderPreference}.`;

      if (uploadedImage && uploadedImage.description) {
        userPrompt += ` The action figure should resemble this person: ${uploadedImage.description}. Make sure the action figure reflects their actual appearance and gender preference.`;
      } else {
        userPrompt += ` The action figure should have a ${genderPreference} appearance.`;
      }

      userPrompt += ` Make it fun, creative and memorable - like a real action figure character!`;

      completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You create fun, creative CRM action figure personas in JSON format with title, quote, and visual_prompt fields. Be playful and imaginative - these are action figures! The title should be a superhero-like name that incorporates their role and personality. The quote should be a catchy one-liner that sounds like something an action figure would say. The visual_prompt should describe a detailed, colorful action figure with accessories and a dynamic pose. If given a person's appearance description, make sure the action figure reflects their actual physical features."
          },
          {
            role: "user",
            content: userPrompt
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
            content: `You are an expert at creating detailed, controlled prompts for DALL-E image generation that produce consistent, professional action figure packaging.

            CRITICAL REQUIREMENTS - MUST INCLUDE ALL:

            1. FIGURE COUNT: Generate exactly 1 action figure unless multiple people are clearly visible in uploaded image. If multiple people detected, generate same number of figures matching appearances, no duplicates.

            2. PACKAGING DESIGN (EXACT SPECIFICATIONS):
            - Background color: #32859a (Julep brand color)
            - Large top title: "Julep Confessionals" in white, bold, clean, modern font
            - Below it: persona title in white, bold, same font style and size
            - NO other words, text, or labels anywhere on packaging
            - Clear plastic blister packaging with cardboard backing

            3. VISUAL CONSTRAINTS:
            - Full-body figure from head to feet, completely visible
            - No body parts cut off or cropped
            - Clean background, no clutter
            - Professional toy product photography style
            - No weapons, no extra random objects
            - EXPRESSIVE FACIAL FEATURES: confident smile, bright eyes, engaging expression that matches uploaded photo personality

            4. ACCESSORY CONTROL (EXACTLY 3-4 ITEMS ONLY):
            - Use ONLY the specific accessories provided in the numbered list
            - Each accessory as miniature toy version in packaging
            - If bonus accessory is listed (#4), it MUST be physically worn or held by the figure (not just loose in packaging)
            - NO additional random accessories beyond those specified
            - NO duplicate accessories or variations of listed items
            - CRITICAL: If 4 accessories are listed, ALL 4 must be included`
          },
          {
            role: "user",
            content: `Create a DALL-E prompt for a CRM action figure based on:

            Title: "${persona.title}"
            Role: ${role}
            Pain Point: ${finalPainPoint}
            Personality: ${crmPersonality}
            Gender Preference: ${genderPreference}
            Bonus Accessory: ${finalBonusAccessory || 'none'}
            Quote: "${persona.quote}"
            ${uploadedImage && uploadedImage.description ? `\nPerson's Appearance: ${uploadedImage.description}` : ''}

            EXACT ACCESSORIES TO INCLUDE (numbered list):
            1. Role accessory: ${ACCESSORY_MAPPINGS.roles[role] || 'work folder'}
            2. Personality accessory: ${ACCESSORY_MAPPINGS.personalities[crmPersonality] || 'clipboard'}
            3. Pain point accessory: ${ACCESSORY_MAPPINGS.painPoints[finalPainPoint] || 'help manual'}${finalBonusAccessory ? `\n            4. Bonus accessory: ${finalBonusAccessory} (MUST be worn or held by figure)` : ''}

            MANDATORY DALL-E PROMPT REQUIREMENTS - MUST INCLUDE ALL:

            1. FIGURE COUNT (CRITICAL):
            - Generate exactly 1 action figure unless multiple people clearly visible in uploaded image
            - If multiple people detected, generate same number of figures matching appearances
            - No duplicates of same figure
            - Single figure in packaging, no random background people

            2. FULL BODY REQUIREMENT (CRITICAL):
            - Full-body action figure from head to feet, completely visible
            - Standing pose showing entire body including legs and feet
            - No body parts cut off or cropped
            - Wearing appropriate shoes that match the outfit
            - Complete figure visible in clear plastic blister packaging

            3. PACKAGING DESIGN (EXACT SPECIFICATIONS):
            - Background color: #32859a (Julep brand color)
            - Large top title: "Julep Confessionals" in white, bold, clean, modern font
            - Below it: "${persona.title}" in white, bold, same font style and size
            - NO other words, text, or labels anywhere on packaging
            - Clear plastic blister packaging with cardboard backing
            - Clean, professional toy packaging design
            - NO picture of action figure on the packaging

            4. EYE COLOR (CRITICAL):
            ${uploadedImage && uploadedImage.description ? `- Match eye color from uploaded image description: ${uploadedImage.description}` : '- Realistic human eye color (brown, blue, green, or hazel)'}
            - Both eyes same color, clear, realistic human eyes

            5. CLOTHING:
            ${uploadedImage && uploadedImage.description ? `- Match clothing from image if visible, otherwise dark professional casual outfit` : 'Dark professional casual clothing (dark pants, shirt)'}
            - Professional appearance suitable for nonprofit work

            6. ACCESSORIES (EXACTLY ${finalBonusAccessory ? '4' : '3'} ITEMS ONLY):
            - Include ONLY the numbered accessories listed above
            - Each accessory as miniature toy version in packaging
            - Bonus accessory MUST be worn or held by figure if provided
            - NO additional random accessories (no soda cans, glasses, text cards)
            - NO weapons, NO firearms of any kind
            - NO extra objects beyond the specified ${finalBonusAccessory ? '4' : '3'} accessories

            7. VISUAL STYLE:
            - Clear plastic blister packaging with cardboard backing
            - Professional toy product photography
            - Clean background, no clutter
            - Single package only, isolated product shot
            - Modern collectible action figure packaging style

            CREATE THE EXACT DALL-E PROMPT NOW:
            Use this template: "Create a 2D digital image of an action figure in realistic toy packaging with a clear plastic window. The packaging background color is #32859a with white, bold, consistent font displaying 'Julep Confessionals' at the top and '${persona.title}' below it. The action figure should reflect the provided physical appearance with expressive facial features (confident smile, bright engaging eyes). The figure should have exactly ${finalBonusAccessory ? '4' : '3'} accessories: [list ALL the specific accessories from the numbered list]. ${finalBonusAccessory ? `CRITICAL: The action figure must be actively wearing or holding the ${finalBonusAccessory} - this is essential. ` : ''}All accessories should appear as miniature toy versions in the packaging, with no extra items or text. Show the full body, including feet. The style should resemble modern collectible action figure packaging."

            Include appearance details and end with: "Professional toy product photography, studio lighting, highly detailed."

            NO quotation marks in your response.`
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      });
      
      dallePrompt = promptCompletion.choices[0].message.content;
      console.log('Generated DALL-E prompt:', dallePrompt);
    } catch (promptError) {
      console.error('Error generating DALL-E prompt:', promptError);

      // Clean systematic accessories list
      const systematicAccessories = getSystematicAccessories(role, crmPersonality, finalPainPoint, finalBonusAccessory);

      let fallbackPrompt = `Create a 2D digital image of an action figure in realistic toy packaging with a clear plastic window. The packaging background color is #32859a with white, bold, consistent font displaying "Julep Confessionals" at the top and "${persona.title}" below it. The action figure represents a ${role} with ${crmPersonality} personality.`;

      if (uploadedImage && uploadedImage.description) {
        fallbackPrompt += ` The action figure matches this appearance: ${uploadedImage.description}, with expressive facial features (confident smile, bright engaging eyes), realistic matching eye color from the uploaded image.`;
      } else {
        fallbackPrompt += ` The ${genderPreference} figure has expressive facial features (confident smile, bright engaging eyes), realistic human eye color (brown, blue, green, or hazel).`;
      }

      fallbackPrompt += ` Dark professional casual clothing, wearing appropriate shoes. The figure should have exactly ${systematicAccessories.length} accessories: ${systematicAccessories.join(', ')} (all as miniature toy versions in packaging). ${finalBonusAccessory ? `CRITICAL: The action figure must be actively wearing or holding the ${finalBonusAccessory} - this is essential. ` : ''}No extra items or text. Show the full body, including feet. Professional toy product photography, studio lighting, highly detailed.`;
      dallePrompt = fallbackPrompt;
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
        painPoint: finalPainPoint,
        crmPersonality,
        genderPreference,
        bonusAccessory: finalBonusAccessory || '',
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

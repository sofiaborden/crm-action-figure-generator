// Load environment variables
require('dotenv').config();

const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const csvWriter = require('csv-writer').createObjectCsvWriter;
const { google } = require('googleapis');

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

// Google Sheets configuration
const SPREADSHEET_ID = '1jzl2flzNhFRIAySOvSzuf2osIjX9Z0RO3xgW1YrbQpw';
const SHEET_NAME = 'Sheet1';

// Google Drive configuration
const DRIVE_FOLDER_ID = '171LV7BAlL0Z6uKjpRJywaqW-lzMlchF1'; // Default sheet name, can be changed

// Google Drive helper function
async function uploadToGoogleDrive(imageUrl, filename) {
  try {
    if (!process.env.GOOGLE_SHEETS_PRIVATE_KEY || !process.env.GOOGLE_SHEETS_CLIENT_EMAIL) {
      console.log('📁 Google Drive credentials not configured, skipping...');
      return null;
    }

    // Set up Google Auth
    const auth = new google.auth.GoogleAuth({
      credentials: {
        type: 'service_account',
        private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, '\n'),
        client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
        client_id: process.env.GOOGLE_SHEETS_CLIENT_ID,
        project_id: process.env.GOOGLE_SHEETS_PROJECT_ID,
      },
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    const drive = google.drive({ version: 'v3', auth });

    // Download the image from DALL-E URL
    const fetch = require('node-fetch');
    const response = await fetch(imageUrl);
    const buffer = await response.buffer();

    // Upload to Google Drive
    const fileMetadata = {
      name: filename,
      parents: [DRIVE_FOLDER_ID],
    };

    const media = {
      mimeType: 'image/png',
      body: require('stream').Readable.from(buffer),
    };

    const file = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id,webViewLink,webContentLink',
    });

    console.log('✅ Successfully uploaded to Google Drive:', file.data.id);
    return {
      fileId: file.data.id,
      viewLink: file.data.webViewLink,
      downloadLink: file.data.webContentLink
    };

  } catch (error) {
    console.error('❌ Error uploading to Google Drive:', error);
    return null;
  }
}

// Google Sheets helper function
async function appendToGoogleSheet(data) {
  try {
    // Check if Google Sheets credentials are available
    if (!process.env.GOOGLE_SHEETS_PRIVATE_KEY || !process.env.GOOGLE_SHEETS_CLIENT_EMAIL) {
      console.log('📊 Google Sheets credentials not configured, skipping...');
      console.log('🔗 Spreadsheet URL: https://docs.google.com/spreadsheets/d/1jzl2flzNhFRIAySOvSzuf2osIjX9Z0RO3xgW1YrbQpw/edit');
      return false;
    }

    // Set up Google Sheets API authentication
    const auth = new google.auth.GoogleAuth({
      credentials: {
        type: 'service_account',
        private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, '\n'),
        client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
        client_id: process.env.GOOGLE_SHEETS_CLIENT_ID,
        project_id: process.env.GOOGLE_SHEETS_PROJECT_ID,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Prepare the row data
    const values = [[
      data.timestamp,
      data.email,
      data.role,
      data.painPoint,
      data.crmPersonality,
      data.genderPreference,
      data.bonusAccessory,
      data.title,
      data.quote,
      data.driveFileId || '',
      data.driveViewLink || ''
    ]];

    // Append to the sheet
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:K`, // Columns A through K (added Drive columns)
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: values,
      },
    });

    console.log('✅ Successfully appended to Google Sheets:', response.data.updates);
    return true;
  } catch (error) {
    console.error('❌ Error appending to Google Sheets:', error);
    return false;
  }
}

// Systematic Accessory Mapping System
const ACCESSORY_MAPPINGS = {
  roles: {
    'Development Director': 'fundraising thermometer',
    'Fundraising Manager': 'donation box',
    'Donor Relations Manager': 'thank you card',
    'Grant Writer': 'grant folder',
    'Program Manager': 'clipboard',
    'Executive Director': 'briefcase',
    'Communications Manager': 'megaphone',
    'Volunteer Coordinator': 'volunteer badge',
    'Database Administrator': 'laptop computer',
    'Development Associate': 'donor folder',
    'Major Gifts Officer': 'handshake card',
    'Event Coordinator': 'event checklist',
    'Other': 'work folder'
  },
  personalities: {
    'Micromanager': 'magnifying glass',
    'Data Hoarder': 'filing cabinet',
    'Tech Avoider': 'notebook',
    'Process Obsessed': 'flowchart',
    'Relationship Builder': 'business cards',
    'Efficiency Expert': 'stopwatch',
    'Dashboard Addict': 'chart tablet',
    'Automation Enthusiast': 'small robot',
    'Reluctant User': 'help book',
    'Other': 'question mark'
  },
  painPoints: {
    'Data entry takes forever': 'keyboard',
    'Too many clicks to do simple tasks': 'computer mouse',
    'Reports are confusing': 'tangled papers',
    'Integration issues': 'puzzle pieces',
    'User adoption problems': 'training book',
    'Duplicate data everywhere': 'copy papers',
    'Mobile app is terrible': 'smartphone',
    'Customization is too complex': 'toolbox',
    'Poor customer support': 'phone',
    'Expensive pricing': 'money bag',
    'Other': 'coffee mug'
  }
};



// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Setup CSV writer for logging
const writer = csvWriter({
  path: 'submissions.csv',
  header: [
    {id: 'timestamp', title: 'TIMESTAMP'},
    {id: 'name', title: 'NAME'},
    {id: 'email', title: 'EMAIL'},
    {id: 'role', title: 'ROLE'},
    {id: 'painPoint', title: 'PAIN_POINT'},
    {id: 'crmPersonality', title: 'CRM_PERSONALITY'},
    {id: 'genderPreference', title: 'DETECTED_GENDER'},
    {id: 'title', title: 'GENERATED_TITLE'},
    {id: 'quote', title: 'GENERATED_QUOTE'},
    {id: 'driveFileId', title: 'DRIVE_FILE_ID'},
    {id: 'driveViewLink', title: 'DRIVE_VIEW_LINK'}
  ],
  append: true
});

// Simple test route
router.get('/test', (req, res) => {
  res.send('Router is working!');
});

// Test Google Sheets connection (GET endpoint for browser testing)
router.get('/test-sheets', async (req, res) => {
  try {
    // Test data
    const testData = {
      timestamp: new Date().toISOString(),
      email: 'test@example.com',
      role: 'Test Role',
      painPoint: 'Test Pain Point',
      crmPersonality: 'Test Personality',
      genderPreference: 'test',
      bonusAccessory: 'Test Accessory',
      title: 'Test Action Figure',
      quote: 'Test quote for Google Sheets integration!',
      driveFileId: 'test-file-id',
      driveViewLink: 'https://drive.google.com/file/d/test-file-id/view'
    };

    const success = await appendToGoogleSheet(testData);

    if (success) {
      res.json({
        success: true,
        message: '✅ Successfully added test data to Google Sheets!',
        testData: testData,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`
      });
    } else {
      res.json({
        success: false,
        message: '❌ Failed to add data to Google Sheets. Check server logs for details.',
        testData: testData
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: '❌ Error testing Google Sheets integration'
    });
  }
});

// Test Google Drive upload (GET endpoint for browser testing)
router.get('/test-drive', async (req, res) => {
  try {
    // Create a simple test image (1x1 pixel PNG)
    const testImageBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
      0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00,
      0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, 0xE2, 0x21, 0xBC, 0x33,
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);

    // Test Google Drive upload
    const filename = `test-drive-upload-${new Date().toISOString().replace(/[:.]/g, '-')}.png`;

    if (!process.env.GOOGLE_SHEETS_PRIVATE_KEY || !process.env.GOOGLE_SHEETS_CLIENT_EMAIL) {
      return res.json({
        success: false,
        message: '❌ Google Drive credentials not configured',
        filename: filename
      });
    }

    // Set up Google Auth
    const auth = new google.auth.GoogleAuth({
      credentials: {
        type: 'service_account',
        private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, '\n'),
        client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
        client_id: process.env.GOOGLE_SHEETS_CLIENT_ID,
        project_id: process.env.GOOGLE_SHEETS_PROJECT_ID,
      },
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    const drive = google.drive({ version: 'v3', auth });

    // Upload to Google Drive
    const fileMetadata = {
      name: filename,
      parents: [DRIVE_FOLDER_ID],
    };

    const media = {
      mimeType: 'image/png',
      body: require('stream').Readable.from(testImageBuffer),
    };

    const file = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id,webViewLink,webContentLink',
    });

    res.json({
      success: true,
      message: '✅ Successfully uploaded test image to Google Drive!',
      filename: filename,
      driveResult: {
        fileId: file.data.id,
        viewLink: file.data.webViewLink,
        downloadLink: file.data.webContentLink
      },
      folderUrl: `https://drive.google.com/drive/folders/${DRIVE_FOLDER_ID}`
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: '❌ Error testing Google Drive integration'
    });
  }
});

// Google Sheets setup status endpoint
router.get('/sheets-status', (req, res) => {
  const hasCredentials = !!(process.env.GOOGLE_SHEETS_PRIVATE_KEY && process.env.GOOGLE_SHEETS_CLIENT_EMAIL);

  res.json({
    configured: hasCredentials,
    spreadsheetId: SPREADSHEET_ID,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`,
    requiredEnvVars: [
      'GOOGLE_SHEETS_PRIVATE_KEY',
      'GOOGLE_SHEETS_CLIENT_EMAIL',
      'GOOGLE_SHEETS_CLIENT_ID',
      'GOOGLE_SHEETS_PROJECT_ID'
    ],
    currentStatus: {
      GOOGLE_SHEETS_PRIVATE_KEY: !!process.env.GOOGLE_SHEETS_PRIVATE_KEY,
      GOOGLE_SHEETS_CLIENT_EMAIL: !!process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      GOOGLE_SHEETS_CLIENT_ID: !!process.env.GOOGLE_SHEETS_CLIENT_ID,
      GOOGLE_SHEETS_PROJECT_ID: !!process.env.GOOGLE_SHEETS_PROJECT_ID
    }
  });
});

// Bulk upload existing CSV data to Google Sheets
router.post('/sync-to-sheets', async (req, res) => {
  try {
    const csvPath = path.join(__dirname, '..', 'submissions.csv');

    if (!fs.existsSync(csvPath)) {
      return res.status(404).json({ error: 'CSV file not found' });
    }

    // Check if Google Sheets is configured
    if (!process.env.GOOGLE_SHEETS_PRIVATE_KEY || !process.env.GOOGLE_SHEETS_CLIENT_EMAIL) {
      return res.status(400).json({
        error: 'Google Sheets not configured',
        message: 'Please set up Google Sheets credentials first'
      });
    }

    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.trim().split('\n');

    // Parse CSV data (current format without headers)
    const submissions = lines.map(line => {
      const [timestamp, email, role, painPoint, personality, title, quote] = line.split(',');
      return {
        timestamp: timestamp || '',
        email: email || '',
        role: role || '',
        painPoint: painPoint || '',
        crmPersonality: personality || '',
        genderPreference: 'legacy', // Old data doesn't have this
        bonusAccessory: '', // Old data doesn't have this
        title: title || '',
        quote: quote || ''
      };
    }).filter(sub => sub.timestamp); // Remove empty lines

    console.log(`📊 Syncing ${submissions.length} submissions to Google Sheets...`);

    let successCount = 0;
    let errorCount = 0;

    // Upload each submission
    for (const submission of submissions) {
      const success = await appendToGoogleSheet(submission);
      if (success) {
        successCount++;
      } else {
        errorCount++;
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    res.json({
      success: true,
      message: `Sync completed: ${successCount} successful, ${errorCount} failed`,
      totalProcessed: submissions.length,
      successCount,
      errorCount
    });

  } catch (error) {
    console.error('Error syncing to Google Sheets:', error);
    res.status(500).json({
      error: 'Failed to sync to Google Sheets',
      details: error.message
    });
  }
});



// Helper function to process uploaded image and analyze it with OpenAI Vision
async function processUploadedImage(file) {
  if (!file) return null;

  try {
    console.log('Processing uploaded image:', {
      filename: file.filename,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path
    });

    // Read the file as base64
    const imageBuffer = fs.readFileSync(file.path);
    const base64Image = imageBuffer.toString('base64');
    console.log('Image converted to base64, length:', base64Image.length);

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
    console.log('Uploaded file:', req.file ? {
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    } : 'No file uploaded');

    const { role, painPoint, crmPersonality, email, name, customPainPoint } = req.body;
    const uploadedImage = req.file ? await processUploadedImage(req.file) : null;

    // Use detected gender from image analysis, or default to ambiguous
    const genderPreference = uploadedImage?.detectedGender || 'ambiguous';

    // Handle custom fields
    const finalPainPoint = painPoint === 'Other' ? customPainPoint : painPoint;

    if (!role || !finalPainPoint || !crmPersonality || !email || !name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, email, role, pain point, and CRM personality are required'
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
            content: `Create DALL-E prompts for action figure packaging with PERFECT TEXT SPELLING.

            CRITICAL TEXT REQUIREMENTS:
            - ONLY these exact words on package: "Julep Confessionals" and the persona title
            - NO other text, NO made-up words, NO additional labels, NO random text
            - Text must be spelled EXACTLY as provided - no variations or misspellings
            - Large "Julep Confessionals" at top, smaller persona title below
            - White bold text on #32859a blue background

            PACKAGING: Clear plastic blister pack, professional toy photography
            FIGURE: Full body visible, professional appearance
            ACCESSORIES: Exactly 3 small toy items from provided list

            FORBIDDEN: Extra text, misspellings, random words, weapons, alcohol`
          },
          {
            role: "user",
            content: `Create a DALL-E prompt for: "${persona.title}"

            CRITICAL: The package must show ONLY these exact words:
            - "Julep Confessionals" (large text at top)
            - "${persona.title}" (smaller text below)
            - NO other text anywhere on the package

            ACCESSORIES (exactly 3 items):
            1. ${ACCESSORY_MAPPINGS.roles[role] || 'work folder'}
            2. ${ACCESSORY_MAPPINGS.personalities[crmPersonality] || 'clipboard'}
            3. ${ACCESSORY_MAPPINGS.painPoints[finalPainPoint] || 'help manual'}

            APPEARANCE: ${uploadedImage && uploadedImage.description ? uploadedImage.description : 'Professional person'}

            Create this exact prompt:
            "Action figure in clear plastic blister packaging with #32859a blue background. ONLY these words on package in white bold text: 'Julep Confessionals' at top and '${persona.title}' below. NO other text. Full-body figure with professional clothing. Exactly 3 small toy accessories: ${ACCESSORY_MAPPINGS.roles[role] || 'work folder'}, ${ACCESSORY_MAPPINGS.personalities[crmPersonality] || 'clipboard'}, ${ACCESSORY_MAPPINGS.painPoints[finalPainPoint] || 'help manual'}. Professional toy photography."

            Return only the prompt, no quotation marks.`
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      });
      
      dallePrompt = promptCompletion.choices[0].message.content;
      console.log('Generated DALL-E prompt:', dallePrompt);
    } catch (promptError) {
      console.error('Error generating DALL-E prompt:', promptError);

      // Simple fallback prompt with strict text requirements
      let fallbackPrompt = `Action figure in clear plastic blister packaging with #32859a blue background. ONLY these words on package in white bold text: "Julep Confessionals" at top and "${persona.title}" below. NO other text anywhere. Full-body figure with professional clothing. Exactly 3 small toy accessories: ${ACCESSORY_MAPPINGS.roles[role] || 'work folder'}, ${ACCESSORY_MAPPINGS.personalities[crmPersonality] || 'clipboard'}, ${ACCESSORY_MAPPINGS.painPoints[finalPainPoint] || 'help manual'}. Professional toy photography.`;
      dallePrompt = fallbackPrompt;
    }
    
    // Generate image using DALL-E with the detailed prompt and retry logic
    console.log('Generating image with DALL-E...');
    const imageUrl = await generateDallEImage(dallePrompt);

    // Upload image to Google Drive (if configured)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `action-figure-${timestamp}-${email.replace('@', '-at-')}.png`;
    const driveResult = await uploadToGoogleDrive(imageUrl, filename);

    // Log submission to CSV and Google Sheets
    const submissionData = {
      timestamp: new Date().toISOString(),
      name,
      email,
      role,
      painPoint: finalPainPoint,
      crmPersonality,
      genderPreference,

      title: persona.title,
      quote: persona.quote,
      driveFileId: driveResult?.fileId || '',
      driveViewLink: driveResult?.viewLink || ''
    };

    try {
      await writer.writeRecords([submissionData]);
      console.log('✅ Submission logged to CSV');
    } catch (csvError) {
      console.error('❌ Error logging to CSV:', csvError);
      // Continue despite CSV error
    }

    // Also log to Google Sheets
    try {
      await appendToGoogleSheet(submissionData);
      console.log('✅ Submission logged to Google Sheets');
    } catch (sheetsError) {
      console.error('❌ Error logging to Google Sheets:', sheetsError);
      // Continue despite Sheets error
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

// Load environment variables
require('dotenv').config();

console.log('OPENAI_API_KEY is set:', !!process.env.OPENAI_API_KEY);

try {
  const OpenAI = require('openai');
  console.log('OpenAI package loaded successfully');
  
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    console.log('OpenAI client initialized successfully');
  } catch (error) {
    console.error('Error initializing OpenAI client:', error);
  }
} catch (error) {
  console.error('Error loading OpenAI package:', error);
}
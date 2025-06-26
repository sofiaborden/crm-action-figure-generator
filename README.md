# CRM Action Figure Generator

A fun, interactive web application that generates personalized action figure images based on users' CRM roles, pain points, and personality types. Users can upload their photo and receive a custom action figure with a humorous quote that reflects their CRM experience.

## 🎯 Features

- **Personalized Action Figures**: Generate custom action figures based on user input
- **Photo Upload**: Users can upload their photo to make the action figure resemble them
- **Multiple Generation Methods**: Choose between DALL-E and GPT for image generation
- **CRM Personality Types**: 10 different personality types including:
  - Micromanager
  - Data Hoarder
  - Tech Avoider
  - Process Obsessed
  - Relationship Builder
  - Efficiency Expert
  - Dashboard Addict
  - Automation Enthusiast
  - Reluctant User
  - Other (custom)
- **Social Sharing**: Share results on Twitter, LinkedIn, or via email
- **Download Feature**: Download generated action figure images
- **Data Collection**: Submissions are saved to CSV for analysis

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- OpenAI API key

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd crm-action-figure-project2
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory and add your OpenAI API key:
```
OPENAI_API_KEY=your_openai_api_key_here
```

4. Start the server:
```bash
npm start
```

5. Open your browser and navigate to `http://localhost:3001`

## 🛠️ Technology Stack

- **Backend**: Node.js, Express.js
- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **AI Integration**: OpenAI API (DALL-E and GPT)
- **File Handling**: Multer for image uploads
- **Data Storage**: CSV files for submission tracking
- **Environment Management**: dotenv

## 📁 Project Structure

```
crm-action-figure-project2/
├── api/                    # API endpoints and logic
│   └── new-generate-card.js # Main card generation endpoint
├── public/                 # Static frontend files
│   └── index.html         # Main application interface
├── uploads/               # User uploaded images
├── logs/                  # Application logs
├── submissions.csv        # User submission records
├── server.js             # Main server file
├── package.json          # Dependencies and scripts
└── README.md             # This file
```

## 🎮 How It Works

1. **User Input**: Users fill out a form with their role, CRM pain points, and personality type
2. **Photo Upload**: Optional photo upload for personalized appearance
3. **AI Generation**: The application uses OpenAI's API to generate both the action figure image and a humorous quote
4. **Result Display**: Users see their custom action figure with title and quote
5. **Sharing**: Users can download, share on social media, or email their results
6. **Data Collection**: Submissions are logged for analysis and improvement

## 🔧 API Endpoints

- `POST /api/generate-card` - Main endpoint for generating action figures
- `GET /api/test` - Test endpoint for API health checks

## 📊 Data Collection

The application collects user submissions in `submissions.csv` including:
- Timestamp
- User role and email
- Pain points and personality type
- Generated content (title, quote, image URL)

## 🚀 Deployment

The application is configured to run on any port (default: 3001) and can be easily deployed to platforms like:
- Heroku
- Vercel
- AWS
- DigitalOcean

## 🤝 Contributing

This project was developed as a creative CRM engagement tool. Future enhancements could include:
- Database integration
- User accounts and history
- More personality types
- Advanced image customization
- Analytics dashboard

## 📝 License

This project is licensed under the ISC License.

## 🎉 Fun Factor

This application turns the often frustrating world of CRM into something fun and shareable, helping teams bond over common experiences while creating memorable, personalized content.

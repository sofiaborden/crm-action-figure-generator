# 📊 Google Sheets Integration Setup Guide

## 🎯 Overview
This guide will help you set up automatic Google Sheets integration for your CRM Action Figure Generator. All form submissions will be automatically logged to your Google Sheet in real-time.

**Your Google Sheet:** https://docs.google.com/spreadsheets/d/1jzl2flzNhFRIAySOvSzuf2osIjX9Z0RO3xgW1YrbQpw/edit

## 🚀 Quick Setup Steps

### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Note your **Project ID**

### Step 2: Enable Google Sheets API
1. In Google Cloud Console, go to **APIs & Services > Library**
2. Search for "Google Sheets API"
3. Click **Enable**

### Step 3: Create Service Account
1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > Service Account**
3. Name it: `crm-action-figure-sheets`
4. Click **Create and Continue**
5. Skip role assignment for now
6. Click **Done**

### Step 4: Generate Service Account Key
1. Click on your new service account
2. Go to **Keys** tab
3. Click **Add Key > Create New Key**
4. Choose **JSON** format
5. Download the JSON file

### Step 5: Share Google Sheet with Service Account
1. Open the downloaded JSON file
2. Copy the `client_email` value (looks like: `crm-action-figure-sheets@your-project.iam.gserviceaccount.com`)
3. Open your Google Sheet: https://docs.google.com/spreadsheets/d/1jzl2flzNhFRIAySOvSzuf2osIjX9Z0RO3xgW1YrbQpw/edit
4. Click **Share** button
5. Add the service account email with **Editor** permissions
6. Click **Send**

c
Add these to your `.env` file (extract from the JSON file):

```env
# Google Sheets Integration
GOOGLE_SHEETS_PROJECT_ID=your-project-id
GOOGLE_SHEETS_CLIENT_EMAIL=crm-action-figure-sheets@your-project.iam.gserviceaccount.com
GOOGLE_SHEETS_CLIENT_ID=123456789012345678901
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
```

**Important:** The private key must include the `\n` characters and be wrapped in quotes.

## 📋 Google Sheet Column Headers
Add these headers to Row 1 of your Google Sheet:

| A | B | C | D | E | F | G | H | I |
|---|---|---|---|---|---|---|---|---|
| TIMESTAMP | EMAIL | ROLE | PAIN_POINT | CRM_PERSONALITY | DETECTED_GENDER | BONUS_ACCESSORY | GENERATED_TITLE | GENERATED_QUOTE |

## 🧪 Testing the Integration

### Check Setup Status
Visit: `https://your-app.com/api/sheets-status`

This will show you:
- ✅ Configuration status
- 📋 Required environment variables
- 🔗 Spreadsheet URL

### Test Submission
1. Generate an action figure through your app
2. Check the console logs for:
   - `✅ Submission logged to CSV`
   - `✅ Submission logged to Google Sheets`
3. Verify new row appears in your Google Sheet

## 🔧 Troubleshooting

### Common Issues:

**"Google Sheets credentials not configured"**
- Check that all 4 environment variables are set
- Restart your server after adding env vars

**"Permission denied"**
- Make sure you shared the sheet with the service account email
- Verify the service account has Editor permissions

**"Invalid private key"**
- Ensure the private key includes `\n` characters
- Wrap the entire key in quotes in your .env file

**"Spreadsheet not found"**
- Verify the spreadsheet ID in the URL matches the code
- Make sure the sheet is shared with the service account

## 🎉 Success!
Once configured, every action figure generation will automatically:
1. ✅ Save to local CSV file (`submissions.csv`)
2. ✅ Append to your Google Sheet in real-time
3. ✅ Include all form data and generated content

## 📊 Data Structure
Each submission includes:
- **Timestamp** - When the action figure was generated
- **Email** - User's email address
- **Role** - Selected nonprofit role
- **Pain Point** - CRM pain point (or custom text)
- **Personality** - Selected CRM personality type
- **Detected Gender** - Auto-detected from uploaded photo
- **Bonus Accessory** - Optional fun accessory selected
- **Generated Title** - AI-generated action figure name
- **Generated Quote** - AI-generated catchphrase

## 🔄 Backup Options
- **CSV Download:** `https://your-app.com/api/download-csv`
- **Data Summary:** `https://your-app.com/api/data-summary`
- **Google Sheets:** Real-time sync (once configured)

---

**Need help?** Check the setup status endpoint or review the console logs for detailed error messages.

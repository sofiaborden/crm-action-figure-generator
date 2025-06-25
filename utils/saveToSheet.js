const fs = require('fs');
const path = require('path');

// Simple mock implementation for now
async function saveToSheet(data) {
  console.log('Saving data:', data);
  
  // Create data directory if it doesn't exist
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // Append data to a JSON file
  const filePath = path.join(dataDir, 'submissions.json');
  let submissions = [];
  
  if (fs.existsSync(filePath)) {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    submissions = JSON.parse(fileContent);
  }
  
  submissions.push({
    ...data,
    timestamp: new Date().toISOString()
  });
  
  fs.writeFileSync(filePath, JSON.stringify(submissions, null, 2));
  
  return true;
}

module.exports = saveToSheet;

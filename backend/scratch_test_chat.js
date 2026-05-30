const axios = require('axios');
const path = require('path');
const fs = require('fs');

const localEnv = path.join(__dirname, '../.env');
if (fs.existsSync(localEnv)) {
  require('dotenv').config({ path: localEnv });
}

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

async function main() {
  console.log('Sending query to AI service:', AI_SERVICE_URL);
  try {
    const res = await axios.post(`${AI_SERVICE_URL}/api/query`, {
      repo_id: '6a10810d9de6a4a610cee39b',
      query: 'What does this project do?',
      k: 6
    });
    console.log('Response:', JSON.stringify(res.data, null, 2));
  } catch (error) {
    console.error('Error querying:', error.response?.data || error.message);
  }
}

main();

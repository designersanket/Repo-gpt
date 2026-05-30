const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const localEnv = path.join(__dirname, '.env');
if (fs.existsSync(localEnv)) {
  require('dotenv').config({ path: localEnv });
}

const RepositorySchema = new mongoose.Schema({}, { strict: false });
const Repository = mongoose.model('Repository', RepositorySchema, 'repositories');

async function main() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/codemind');
  console.log('Connected to MongoDB');
  const repos = await Repository.find({});
  console.log('Repositories:', JSON.stringify(repos, null, 2));
  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

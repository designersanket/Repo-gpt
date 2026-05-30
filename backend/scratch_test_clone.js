const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const localEnv = path.join(__dirname, '../.env');
if (fs.existsSync(localEnv)) {
  require('dotenv').config({ path: localEnv });
}

const Repository = require('./models/Repository');
const repoController = require('./controllers/repoController');

async function main() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/codemind');
  console.log('Connected to MongoDB');

  // Let's call cloneRepo logic directly
  const req = {
    body: {
      gitUrl: 'https://github.com/designersanket/Calculator-Using-js',
      name: 'test-clone-calculator'
    },
    user: {
      _id: new mongoose.Types.ObjectId('6a0ff95ff14611a636c2819b') // dummy/existing user ID
    }
  };

  const res = {
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(obj) {
      console.log('Response JSON:', obj);
      return this;
    }
  };

  await repoController.cloneRepo(req, res);
  
  // Wait for background indexing to complete (or fail)
  console.log('Waiting 15 seconds for indexing...');
  await new Promise(resolve => setTimeout(resolve, 15000));

  // Query database to see status of the created repo
  const repo = await Repository.findOne({ name: 'test-clone-calculator' }).sort('-createdAt');
  if (repo) {
    console.log('Repo Status:', repo.status);
    console.log('Repo Error:', repo.error);
    console.log('Repo Path:', repo.pathOnDisk);
    // Delete test repo from db
    await repo.deleteOne();
    console.log('Cleaned up test repo from DB');
    // Remove from disk if exists
    if (fs.existsSync(repo.pathOnDisk)) {
      const gitService = require('./services/gitService');
      await gitService.removeDir(repo.pathOnDisk);
      console.log('Cleaned up test repo from Disk');
    }
  } else {
    console.log('No repository found with name test-clone-calculator');
  }

  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

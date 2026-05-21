const mongoose = require('mongoose');

const RepositorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a repository name'],
    trim: true,
  },
  gitUrl: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ['cloning', 'parsing', 'indexing', 'ready', 'failed'],
    default: 'cloning',
  },
  error: {
    type: String,
    default: '',
  },
  progress: {
    type: Number,
    default: 0,
  },
  fileTree: {
    type: mongoose.Schema.Types.Mixed, // Stores folder hierarchy object
  },
  languages: [
    {
      type: String,
    },
  ],
  pathOnDisk: {
    type: String,
    required: true,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Repository', RepositorySchema);

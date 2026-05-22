const mongoose = require('mongoose');

const RepositorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  gitUrl: { type: String, trim: true },
  status: {
    type: String,
    enum: ['cloning', 'parsing', 'indexing', 'ready', 'failed'],
    default: 'cloning',
  },
  error: { type: String, default: '' },
  progress: { type: Number, default: 0 },
  fileTree: { type: mongoose.Schema.Types.Mixed },
  languages: [{ type: String }],
  pathOnDisk: { type: String, required: true },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Repository', RepositorySchema);

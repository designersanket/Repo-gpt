const mongoose = require('mongoose');

const ChatMessageSchema = new mongoose.Schema({
  repoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Repository', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  role: { type: String, enum: ['user', 'assistant'], required: true },
  message: { type: String, required: true },
  references: [{
    filepath: String,
    relative_path: String,
    node_type: String,
    name: String,
    start_line: Number,
    end_line: Number,
    score: Number,
  }],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ChatMessage', ChatMessageSchema);

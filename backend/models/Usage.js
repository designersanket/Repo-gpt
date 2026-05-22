const mongoose = require('mongoose');

const UsageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },
  aiRequests: { type: Number, default: 0 },
  embeddingRequests: { type: Number, default: 0 },
  repoClones: { type: Number, default: 0 },
  promptTokens: { type: Number, default: 0 },
  completionTokens: { type: Number, default: 0 },
  tokensUsed: { type: Number, default: 0 },
  estimatedCost: { type: Number, default: 0 },
  failedRequests: { type: Number, default: 0 },
  quotaViolations: { type: Number, default: 0 },
  lastReset: { type: Date, default: () => new Date(new Date().setUTCHours(0, 0, 0, 0)) },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

UsageSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Usage', UsageSchema);

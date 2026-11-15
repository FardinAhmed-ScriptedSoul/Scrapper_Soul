const mongoose = require('mongoose');

const feedSourceStatusSchema = new mongoose.Schema({
  sourceId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  provider: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['success', 'failed'],
    required: true
  },
  lastStartedAt: {
    type: Date,
    required: true
  },
  lastFinishedAt: {
    type: Date,
    required: true
  },
  lastSuccessAt: {
    type: Date,
    default: null
  },
  lastError: {
    type: String,
    default: null
  },
  lastItemCount: {
    type: Number,
    default: 0
  },
  lastNewCount: {
    type: Number,
    default: 0
  },
  durationMs: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('FeedSourceStatus', feedSourceStatusSchema);

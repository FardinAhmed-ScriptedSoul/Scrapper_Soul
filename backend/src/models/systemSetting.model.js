
// backend/src/models/systemSettings.model.js
const mongoose = require('mongoose');

// One settings document per user — upserted on save
const systemSettingsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  maxConcurrency: {
    type: Number,
    default: 16,
    min: 1,
    max: 64
  },
  retentionDays: {
    type: Number,
    default: 30,
    enum: [7, 30, 90]
  },
  isWebhookEnabled: {
    type: Boolean,
    default: false
  },
  // Hashed or display-only reference key — never expose raw secrets
  apiKey: {
    type: String,
    default: () => `sk_live_${Math.random().toString(36).slice(2, 18)}`
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);

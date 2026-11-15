const mongoose = require('mongoose');

const savedSearchPresetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 80
  },
  engine: {
    type: String,
    enum: ['amazon', 'indeed', 'booking'],
    required: true
  },
  query: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  location: {
    type: String,
    trim: true,
    default: ''
  },
  checkIn: {
    type: String,
    default: ''
  },
  checkOut: {
    type: String,
    default: ''
  }
}, { timestamps: true });

savedSearchPresetSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('SavedSearchPreset', savedSearchPresetSchema);

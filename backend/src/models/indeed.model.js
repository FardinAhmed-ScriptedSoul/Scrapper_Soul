const mongoose = require('mongoose');

const indeedJobSchema = new mongoose.Schema({
  jobTitleQuery: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  locationQuery: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  company: {
    type: String,
    default: 'N/A',
    trim: true
  },
  location: {
    type: String,
    default: 'Remote / Unspecified',
    trim: true
  },
  salaryInfo: {
    type: String,
    default: 'Not Disclosed',
    trim: true
  },
  benefits: {
    type: [String],
    default: []
  },
  salaryEnriched: {
    type: Boolean,
    default: false
  },
  summary: {
    type: String,
    trim: true
  },
  jobUrl: {
    type: String,
    required: true,
    trim: true
  }
}, {
  timestamps: true
});

// Fast cache lookup by query pair
indeedJobSchema.index({ jobTitleQuery: 1, locationQuery: 1 });

module.exports = mongoose.model('IndeedJob', indeedJobSchema);
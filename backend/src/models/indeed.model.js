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
    default: 'Not disclosed',
    trim: true
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

// ⚡ COMPOUND INDEX: Guarantees lightning-fast lookups when checking for identical Title + Location pairs
indeedJobSchema.index({ jobTitleQuery: 1, locationQuery: 1 });

module.exports = mongoose.model('IndeedJob', indeedJobSchema);
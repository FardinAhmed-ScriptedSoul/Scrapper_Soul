//NEW — stores user-defined schedules in MongoDB


// backend/src/models/scrapeSchedule.model.js
const mongoose = require('mongoose');

const scrapeScheduleSchema = new mongoose.Schema({
  // Owner
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Which scraper
  engine: {
    type: String,
    enum: ['amazon', 'indeed', 'booking'],
    required: true
  },

  // Search parameters
  query: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    trim: true,
    default: ''
  },

  // Cron expression e.g. "0 9 * * *" = every day at 9am
  cronExpression: {
    type: String,
    required: [true, 'Cron expression is required'],
    // default: '0 9 * * *'
  },

  isActive: {
    type: Boolean,
    default: true
  },

  // Populated after each run
  lastRun: {
    type: Date,
    default: null
  },
  lastRunStatus: {
    type: String,
    enum: ['success', 'failed', 'pending', null],
    default: null
  },
  lastRunCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

scrapeScheduleSchema.index({ userId: 1, engine: 1 });

module.exports = mongoose.model('ScrapeSchedule', scrapeScheduleSchema);

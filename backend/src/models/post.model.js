const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
  // The category helps us filter when a user clicks a button (e.g., 'international', 'tech', 'crypto', 'osint')
  category: {
    type: String,
    required: true,
    enum: ['international', 'tech', 'crypto', 'osint'],
    index: true
  },
  title: {
    type: String,
    required: true
  },
  contentSummary: {
    type: String,
    default: ""
  },
  sourceName: {
    type: String,
    required: true // e.g., 'BBC News', 'The Hacker News', 'CoinGecko'
  },
  sourceUrl: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String,
    default: ""
  },
  // Unique identifier to prevent saving duplicate posts every time the scraper runs
  uniqueGuid: {
    type: String,
    required: true,
    unique: true
  },
  publishedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('Post', PostSchema);
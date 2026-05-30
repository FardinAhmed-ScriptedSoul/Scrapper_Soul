const mongoose = require('mongoose');

const amazonBookSchema = new mongoose.Schema({
  searchTerm: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true // ⚡ Fast lookups for exact text queries
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  authors: [{
    type: String,
    trim: true
  }],
  price: {
    type: Number,
    default: null // Numeric type enables easy sorting/filtering later
  },
  rating: {
    type: Number,
    default: null
  },
  reviewsCount: {
    type: Number,
    default: 0
  },
  productUrl: {
    type: String,
    required: true,
    trim: true
  },
  imageUrl: {
    type: String,
    trim: true
  }
}, { 
  timestamps: true // Automatically tracks 'createdAt' and 'updatedAt'
});

module.exports = mongoose.model('AmazonBook', amazonBookSchema);
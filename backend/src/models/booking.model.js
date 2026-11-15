const mongoose = require('mongoose');

const bookingHotelSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  destinationQuery: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  checkInDate: {
    type: String, // Stored in consistent standard 'YYYY-MM-DD' formatting
    required: true
  },
  checkOutDate: {
    type: String, // Stored in consistent standard 'YYYY-MM-DD' formatting
    required: true
  },
  hotelName: {
    type: String,
    required: true,
    trim: true
  },
  pricePerNight: {
    type: Number,
    default: null
  },
  rating: {
    type: Number,
    default: null
  },
  reviewsCount: {
    type: Number,
    default: 0
  },
  hotelUrl: {
    type: String,
    required: true,
    trim: true
  },
  imageUrl: {
    type: String,
    trim: true
  }
}, { 
  timestamps: true 
});

// ⚡ COMPOUND INDEX: Optimizes lookups for exact destination and stay windows
bookingHotelSchema.index({ destinationQuery: 1, checkInDate: 1, checkOutDate: 1 });
bookingHotelSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('BookingHotel', bookingHotelSchema);
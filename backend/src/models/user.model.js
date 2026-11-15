const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/config.js');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    lowercase: true,
    minlength: [3, 'Username must be at least 3 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/\S+@\S+\.\S+/, 'Please provide a valid email address']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Protection Guard: Never leaks during normal queries unless explicitly selected
  },
  tokenVersion: {
    type: Number,
    default: 0,
    select: false // Keeps payload footprint clean
  },
  // 🔑 MISSING CONFIGURATIONS ADDED BELOW
  resetPasswordToken: {
    type: String,
    default: null
  },
  resetPasswordExpiry: {
    type: Date,
    default: null
  },
  notificationPreferences: {
    type: new mongoose.Schema({
      enabled: {
        type: Boolean,
        default: false
      },
      events: {
        completed: {
          type: Boolean,
          default: true
        },
        failed: {
          type: Boolean,
          default: true
        }
      }
    }, { _id: false }),
    default: () => ({})
  }
}, { timestamps: true });

userSchema.virtual('userName').set(function (value) {
  if (value && !this.username) this.username = value;
});

// Pre-save hook to hash password automatically
userSchema.pre('save', async function () {
  // ✅ FIXED: Simply return early if the password hasn't changed. No next() needed.
  if (!this.isModified('password')) return;

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    // ✅ FIXED: Removed next() completely. The async function resolving handles it natively.
  } catch (error) {
    throw error; // Safely passes the error down the Mongoose validation pipeline
  }
});

// Instance method to verify input password against hashed records
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to generate Signed JWT directly from user document instance
userSchema.methods.generateAuthToken = function () {
  return jwt.sign(
    { 
      id: this._id, 
      tokenVersion: this.tokenVersion || 0 
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
};

module.exports = mongoose.model('User', userSchema);
const mongoose = require('mongoose');

const blacklistSchema = new mongoose.Schema(
    {
        token: {
            type: String,
            required: true,
            unique: true,
            index: true 
        },
        expiresAt: {
            type: Date,
            required: true,
            expires: 0 // Native Mongoose TTL marker: Deletes this row automatically when the clock passes expiresAt
        }
    },
    { timestamps: true }
);

const blacklistModel = mongoose.model('Blacklist', blacklistSchema);
module.exports = blacklistModel;
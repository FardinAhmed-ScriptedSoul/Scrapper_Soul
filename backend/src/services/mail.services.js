const nodemailer = require('nodemailer');
const config = require('../config/config.js');

// 1. Initialize the Secure OAuth2 Transporter Instance using consolidated configs
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        type: 'OAuth2',
        user: config.mail.user,
        clientId: config.mail.clientId,
        clientSecret: config.mail.clientSecret,
        refreshToken: config.mail.refreshToken,
    },
});

// 2. Perform Startup Verification Checks
transporter.verify((error, success) => {
    if (error) {
        console.error('❌ Nodemailer failed to verify connection profile:', error.message);
    } else {
        console.log('🚀 Nodemailer system verified: Email engine is active');
    }
});

/**
 * Universal Unified Email Delivery Dispatcher
 * @param {string} to Target destination email profile address
 * @param {string} subject Text context header
 * @param {string} text Fallback plaintext body template
 * @param {string} html Styled rich markup HTML interface
 */
const sendEmail = async (to, subject, text, html) => {
    const mailOptions = {
        
        from: `"Scrapper-Soul Security" <${config.mail.user}>`,
        to,
        subject,
        text,
        html
    };
    return transporter.sendMail(mailOptions);
};

module.exports = { transporter, sendEmail };
/**
 * 📊 Operational Activity Tracker Middleware
 * Logs incoming system actions for analytical visibility.
 * @param {string} operationType Discriminator string for log classification
 */
function trackActivity(operationType = 'generic_operation') {
    return (req, res, next) => {
        try {
            const userIdentifier = req.user ? req.user.email : 'Anonymous/Unauthenticated';
            const timestamp = new Date().toISOString();
            
            // Log the activity signature to your terminal stream
            console.log(`[ACTIVITY LOG] [${timestamp}] User: ${userIdentifier} | Action: ${operationType} | Path: ${req.originalUrl}`);
            
            // 💡 Future Expansion: You can easily save this directly to an Activity collection in MongoDB here
            
            next();
        } catch (error) {
            // Non-blocking catch guard: Ensures a logging failure never breaks the primary user request loop
            console.error("⚠️ Activity tracking anomaly recorded:", error.message);
            next();
        }
    };
}

module.exports = { trackActivity };
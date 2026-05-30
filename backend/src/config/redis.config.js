const { createClient } = require('redis');
const config = require('./config.js'); // ✅ FIXED: Import the core default object directly without destructuring

let redisClient = null;

// Safely confirm config object paths exist before reading properties
if (config && config.redis && config.redis.uri) {
    // Create the client instance using the URI from config
    const client = createClient({ url: config.redis.uri });

    client.on('error', (err) => console.error('🔴 Redis Client Runtime Error:', err.message));
    client.on('connect', () => console.log('⚡ Redis Connected Successfully (Upstash RAM Engine Active)'));

    // Assign to the exported reference
    redisClient = client;

    // Connect asynchronously without blocking main server event loop
    client.connect().catch((err) => {
        console.warn('⚠️ Redis connection failed:', err.message);
        console.warn('⚙️ Falling back to MongoDB storage engine safely for Blacklist / Session lookups.');
        redisClient = null; // Revert reference to null so controllers safely redirect logic
    });
} else {
    console.log('ℹ️ No REDIS_URL provided or configuration invalid. Blacklist management defaulting to MongoDB engine.');
}

module.exports = redisClient;
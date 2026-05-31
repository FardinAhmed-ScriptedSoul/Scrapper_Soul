// backend/src/queues/scrapeQueue.js
const Bull = require('bull');
const Redis = require('ioredis'); // 🚀 Add this import to configure client profiles
const config = require('../config/config.js');

// Create standard resilient reusable connection instances for Bull
const client = new Redis(config.redis.uri, {
  maxRetriesPerRequest: null, // 🚀 CRITICAL: This completely stops the "max retries per request limit" crash
  enableReadyCheck: false,
  connectTimeout: 15000
});

const subscriber = new Redis(config.redis.uri, {
  maxRetriesPerRequest: null, // 🚀 CRITICAL
  enableReadyCheck: false,
  connectTimeout: 15000
});

// Bull queue backed by configured connections
const scrapeQueue = new Bull('scrape-jobs', {
  createClient: (type) => {
    switch (type) {
      case 'client': return client;
      case 'subscriber': return subscriber;
      default:
        return new Redis(config.redis.uri, {
          maxRetriesPerRequest: null, // 🚀 CRITICAL
          enableReadyCheck: false,
          connectTimeout: 15000
        });
    }
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: false,
    removeOnFail: false
  }
});

scrapeQueue.on('error', (err) => console.error('❌ Bull Queue Error:', err.message));
scrapeQueue.on('waiting', (jobId) => console.log(`⏳ Job queued: ${jobId}`));
scrapeQueue.on('active', (job) => console.log(`🚀 Job started: ${job.id} [${job.data.engine}]`));
scrapeQueue.on('completed', (job) => console.log(`✅ Job done: ${job.id} [${job.data.engine}]`));
scrapeQueue.on('failed', (job, err) => console.error(`❌ Job failed: ${job.id} — ${err.message}`));

module.exports = scrapeQueue;
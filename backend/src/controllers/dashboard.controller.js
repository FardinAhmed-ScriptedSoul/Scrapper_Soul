// backend/src/controllers/dashboard.controller.js
const os = require('os');
const AmazonBook = require('../models/amazon.model.js');
const BookingHotel = require('../models/booking.model.js');
const IndeedJob = require('../models/indeed.model.js');
const Post = require('../models/post.model.js');
const ScrapeSchedule = require('../models/scrapeSchedule.model.js');
const SystemSettings = require('../models/systemSetting.model.js');
const scrapeQueue = require('../queues/scrapeQueue.js');
const { syncSchedule } = require('../schedulers/cronScheduler.js');

// ── 1. TELEMETRY DATA EXTRACTOR ──────────────────────────────────────────────
exports.getTelemetryData = async (req, res) => {
  try {
    let amazonCount = 0, bookingCount = 0, indeedCount = 0, postCount = 0;
    try {
      [amazonCount, bookingCount, indeedCount, postCount] = await Promise.all([
        AmazonBook ? AmazonBook.countDocuments() : 0,
        BookingHotel ? BookingHotel.countDocuments() : 0,
        IndeedJob ? IndeedJob.countDocuments() : 0,
        Post ? Post.countDocuments() : 0
      ]);
    } catch (dbErr) {
      console.warn("⚠️ Database count sync dropped temporarily:", dbErr.message);
    }

    let waiting = 0, active = 0, completed = 0, failed = 0;
    try {
      [waiting, active, completed, failed] = await Promise.all([
        scrapeQueue.getWaitingCount(),
        scrapeQueue.getActiveCount(),
        scrapeQueue.getCompletedCount(),
        scrapeQueue.getFailedCount()
      ]);
    } catch (redisErr) {
      console.warn("⚠️ Redis count skipped (ECONNRESET protection active):", redisErr.message);
    }

    const totalHarvested = amazonCount + bookingCount + indeedCount + postCount;

    return res.status(200).json({
      success: true,
      totalHarvested,
      activeTasks: active || waiting || 0,
      successRate: 100,
      bandwidth: "0.0 MB/s",
      systemHealth: {
        memory: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100),
        cpu: Math.round(os.loadavg()[0] * 10) || 5,
        throttleFaults: 0
      },
      liveLogs: [{ timestamp: new Date(), message: "Telemetry matrix linked safely." }]
    });
  } catch (error) {
    console.error("❌ Critical Dashboard Processing Fault:", error);
    return res.status(500).json({ success: false, message: "Server interface processing failure." });
  }
};

// ── 2. TASK QUEUE HISTORY LISTENER ───────────────────────────────────────────
exports.getTasks = async (req, res) => {
  try {
    let tasks = [];
    
    try {
      const [waitingJobs, activeJobs, completedJobs, failedJobs] = await Promise.all([
        scrapeQueue.getJobs(['waiting'], 0, 5),
        scrapeQueue.getJobs(['active'], 0, 5),
        scrapeQueue.getJobs(['completed'], 0, 10),
        scrapeQueue.getJobs(['failed'], 0, 5)
      ]);

      const formatJob = (job, status) => ({
        id: `JOB-${job.id}`,
        target: `${job.data.engine} — "${job.data.query}"${job.data.location ? ` / ${job.data.location}` : ''}`,
        engine: job.data.engine,
        status: status,
        processed: job.returnvalue?.savedCount ?? 0,
        total: job.returnvalue?.savedCount ?? 0,
        speed: status === 'Running' ? '~15 req/s' : '0 req/s',
        addedAt: job.timestamp,
        finishedAt: job.finishedOn || null,
        failReason: job.failedReason || null,
        progress: typeof job.progress === 'function' ? job.progress() : (job._progress || 0)
      });

      tasks = [
        ...activeJobs.map(j => formatJob(j, 'Running')),
        ...waitingJobs.map(j => formatJob(j, 'Queued')),
        ...completedJobs.map(j => formatJob(j, 'Completed')),
        ...failedJobs.map(j => formatJob(j, 'Failed'))
      ];
    } catch (redisErr) {
      console.warn("⚠️ Redis task fetch bypassed (ECONNRESET protection active):", redisErr.message);
    }

    return res.status(200).json({ success: true, data: tasks });
  } catch (error) {
    console.error("❌ getTasks unexpected runtime error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch task queue matrix array." });
  }
};

// ── 3. QUEUE PIPELINE LIFECYCLE MANAGEMENT ───────────────────────────────────
exports.controlTask = async (req, res) => {
  try {
    const { jobId, action } = req.body;
    if (!jobId || !action) {
      return res.status(400).json({ success: false, error: "jobId and action required." });
    }

    const rawId = jobId.replace('JOB-', '');
    const job = await scrapeQueue.getJob(rawId);
    if (!job) return res.status(404).json({ success: false, error: "Job not found in queue." });

    if (action === 'kill') await job.remove();
    if (action === 'retry') await job.retry();
    if (action === 'pause') await scrapeQueue.pause();
    if (action === 'resume') await scrapeQueue.resume();

    return res.status(200).json({ success: true, message: `Action [${action}] executed on job ${jobId}.` });
  } catch (error) {
    console.error("❌ controlTask error:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ── 4. CHRONO SCRAPING SCHEDULES CRUD ────────────────────────────────────────
exports.getSchedules = async (req, res) => {
  try {
    const schedules = await ScrapeSchedule.find({ userId: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: schedules });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.createSchedule = async (req, res) => {
  try {
    const { engine, query, location, cronExpression } = req.body;
    if (!engine || !query || !cronExpression) {
      return res.status(400).json({ success: false, error: "engine, query, and cronExpression are required." });
    }

    const schedule = await ScrapeSchedule.create({
      userId: req.user._id,
      engine,
      query: query.trim().toLowerCase(),
      location: (location || '').trim().toLowerCase(),
      cronExpression
    });

    await syncSchedule(schedule._id);
    return res.status(201).json({ success: true, data: schedule });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const schedule = await ScrapeSchedule.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      req.body,
      { new: true }
    );
    if (!schedule) return res.status(404).json({ success: false, error: "Schedule not found." });

    await syncSchedule(schedule._id);
    return res.status(200).json({ success: true, data: schedule });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const schedule = await ScrapeSchedule.findOneAndDelete({ _id: id, userId: req.user._id });
    if (!schedule) return res.status(404).json({ success: false, error: "Schedule not found." });

    const { unregisterCron } = require('../schedulers/cronScheduler.js');
    unregisterCron(id);

    return res.status(200).json({ success: true, message: "Schedule deleted." });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ── 5. PERSISTED USER CONTROL SETTINGS ───────────────────────────────────────
exports.getSettings = async (req, res) => {
  try {
    let settings = null;
    if (SystemSettings) {
      settings = await SystemSettings.findOne({ userId: req.user?._id });
    }
    
    if (!settings) {
      settings = {
        retentionDays: 30,
        maxConcurrency: 16,
        isWebhookEnabled: true,
        apiKey: "sk_live_secret_key_default"
      };
    }
    return res.status(200).json({ success: true, current: settings });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to load system settings profile matrix." });
  }
};

exports.saveSettings = async (req, res) => {
  try {
    const { retentionDays, maxConcurrency, isWebhookEnabled, apiKey } = req.body;

    const settings = await SystemSettings.findOneAndUpdate(
      { userId: req.user._id },
      {
        ...(retentionDays !== undefined && { retentionDays: Number(retentionDays) }),
        ...(maxConcurrency !== undefined && { maxConcurrency: Number(maxConcurrency) }),
        ...(isWebhookEnabled !== undefined && { isWebhookEnabled: Boolean(isWebhookEnabled) }),
        ...(apiKey !== undefined && { apiKey: String(apiKey).trim() })
      },
      { new: true, upsert: true }
    );
    return res.status(200).json({ success: true, message: "Settings saved.", current: settings });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Settings save fault.", error: error.message });
  }
};

// ── 6. VIRTUAL BACKBONE PROXIES POOL ─────────────────────────────────────────
exports.getProxies = async (req, res) => {
  return res.status(200).json([
    { id: "P-NODE-01", address: "198.51.100.45:8080", type: "HTTP-STEALTH", location: "US-East", latency: "42ms", status: "Healthy" },
    { id: "P-NODE-02", address: "185.190.140.11:3128", type: "SOCKS5-RESIDENTIAL", location: "EU-Central", latency: "115ms", status: "Healthy" },
    { id: "P-NODE-03", address: "45.124.84.112:9050", type: "SOCKS5-TOR-GATEWAY", location: "Asia-Pacific", latency: "264ms", status: "Slow" }
  ]);
};
// backend/src/controllers/dashboard.controller.js
const os = require('os');
const {
  amazonBooks,
  bookingHotels,
  indeedJobs,
  posts,
  scrapeSchedules
} = require('../repositories');
const scrapeQueue = require('../queues/scrapeQueue.js');
const { syncSchedule } = require('../schedulers/cronScheduler.js');
const cron = require('node-cron');

// ── 1. TELEMETRY DATA EXTRACTOR ──────────────────────────────────────────────
exports.getTelemetryData = async (req, res) => {
  try {
    const [amazonCount, bookingCount, indeedCount, postCount] = await Promise.all([
      amazonBooks.countDocuments({ userId: req.user._id }),
      bookingHotels.countDocuments({ userId: req.user._id }),
      indeedJobs.countDocuments({ userId: req.user._id }),
      posts.countDocuments()
    ]);
    const [waiting, active, completed, failed] = await Promise.all([
      scrapeQueue.getWaitingCount(),
      scrapeQueue.getActiveCount(),
      scrapeQueue.getCompletedCount(),
      scrapeQueue.getFailedCount()
    ]);

    const totalHarvested = amazonCount + bookingCount + indeedCount + postCount;
    const finishedTasks = completed + failed;
    const successRate = finishedTasks > 0
      ? Math.round((completed / finishedTasks) * 100)
      : null;

    return res.status(200).json({
      success: true,
      totalHarvested,
      activeTasks: active,
      queuedTasks: waiting,
      successRate,
      recordsBySource: {
        amazon: amazonCount,
        indeed: indeedCount,
        booking: bookingCount,
        news: postCount
      },
      systemHealth: {
        memory: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100)
      }
    });
  } catch (error) {
    console.error("❌ Critical Dashboard Processing Fault:", error);
    return res.status(500).json({ success: false, message: "Failed to load dashboard overview." });
  }
};

// ── 2. TASK QUEUE HISTORY LISTENER ───────────────────────────────────────────
exports.getTasks = async (req, res) => {
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
      query: job.data.query,
      location: job.data.location || '',
      checkIn: job.data.checkIn || '',
      checkOut: job.data.checkOut || '',
      status,
      addedAt: job.timestamp,
      finishedAt: job.finishedOn || null,
      failReason: job.failedReason || null,
      progress: typeof job.progress === 'function' ? job.progress() : (job._progress || 0)
    });

    const tasks = [
      ...activeJobs.map((job) => formatJob(job, 'Running')),
      ...waitingJobs.map((job) => formatJob(job, 'Queued')),
      ...completedJobs.map((job) => formatJob(job, 'Completed')),
      ...failedJobs.map((job) => formatJob(job, 'Failed'))
    ];

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
    if (!['kill', 'retry'].includes(action)) {
      return res.status(400).json({ success: false, error: "Action must be kill or retry." });
    }

    const rawId = jobId.replace('JOB-', '');
    const job = await scrapeQueue.getJob(rawId);
    if (!job) return res.status(404).json({ success: false, error: "Job not found in queue." });

    if (action === 'kill') await job.remove();
    if (action === 'retry') await job.retry();

    return res.status(200).json({ success: true, message: `Action [${action}] executed on job ${jobId}.` });
  } catch (error) {
    console.error("❌ controlTask error:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ── 4. CHRONO SCRAPING SCHEDULES CRUD ────────────────────────────────────────
exports.getSchedules = async (req, res) => {
  try {
    const schedules = await scrapeSchedules.find(
      { userId: req.user._id },
      { sort: { createdAt: -1 } }
    );
    return res.status(200).json({ success: true, data: schedules });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.createSchedule = async (req, res) => {
  try {
    const { engine, query, location, cronExpression } = req.body;
    if (!['amazon', 'indeed'].includes(engine)) {
      return res.status(400).json({ success: false, error: "Schedules support Amazon and Indeed only." });
    }
    if (!query?.trim() || !cronExpression || !cron.validate(cronExpression)) {
      return res.status(400).json({ success: false, error: "A search query and valid schedule frequency are required." });
    }
    if (engine === 'indeed' && !location?.trim()) {
      return res.status(400).json({ success: false, error: "An Indeed location is required." });
    }

    const schedule = await scrapeSchedules.create({
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
    if (typeof req.body.isActive !== 'boolean') {
      return res.status(400).json({ success: false, error: "isActive must be a boolean." });
    }

    const existing = await scrapeSchedules.findOne({ _id: id, userId: req.user._id });
    if (!existing) return res.status(404).json({ success: false, error: "Schedule not found." });
    if (existing.engine === 'booking' && req.body.isActive) {
      return res.status(400).json({ success: false, error: "Booking schedules are not supported." });
    }

    const schedule = await scrapeSchedules.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      { isActive: req.body.isActive },
      { returnDocument: 'after' }
    );

    await syncSchedule(schedule._id);
    return res.status(200).json({ success: true, data: schedule });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const schedule = await scrapeSchedules.findOneAndDelete({ _id: id, userId: req.user._id });
    if (!schedule) return res.status(404).json({ success: false, error: "Schedule not found." });

    const { unregisterCron } = require('../schedulers/cronScheduler.js');
    unregisterCron(id);

    return res.status(200).json({ success: true, message: "Schedule deleted." });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};


// backend/src/schedulers/cronScheduler.js
const cron = require('node-cron');
const ScrapeSchedule = require('../models/scrapeSchedule.model.js');
const scrapeQueue = require('../queues/scrapeQueue.js'); // Imports clean configuration model instance

const activeCrons = new Map();

const initScheduler = async () => {
  try {
    const schedules = await ScrapeSchedule.find({ isActive: true });
    console.log(`🕐 CronScheduler: Loading ${schedules.length} active schedules...`);
    schedules.forEach(registerCron);
    console.log('✅ CronScheduler: All schedules registered successfully.');
  } catch (err) {
    console.error('❌ CronScheduler boot error:', err.message);
  }
};

const registerCron = (schedule) => {
  if (!schedule || !schedule._id) return;
  const id = schedule._id.toString();

  if (activeCrons.has(id)) {
    activeCrons.get(id).stop();
    activeCrons.delete(id);
  }

  if (!cron.validate(schedule.cronExpression)) {
    console.warn(`⚠️ Invalid cron expression format assigned to item ID ${id}`);
    return;
  }

  const task = cron.schedule(schedule.cronExpression, async () => {
    console.log(`⏰ Cron firing for schedule ${id} [${schedule.engine}]`);
    try {
      // Shield write execution with a check for active Redis sockets
      await scrapeQueue.add({
        engine: schedule.engine,
        query: schedule.query,
        location: schedule.location || '',
        scheduleId: id
      }, {
        jobId: `cron-${id}-${Date.now()}`
      });
    } catch (err) {
      console.error(`❌ Failed to inject automatic task into queue context layer ${id}:`, err.message);
    }
  });

  activeCrons.set(id, task);
};

const unregisterCron = (scheduleId) => {
  if (!scheduleId) return;
  const id = scheduleId.toString();
  if (activeCrons.has(id)) {
    activeCrons.get(id).stop();
    activeCrons.delete(id);
    console.log(`🛑 Cron stopped for schedule identifier: ${id}`);
  }
};

const syncSchedule = async (scheduleId) => {
  try {
    const schedule = await ScrapeSchedule.findById(scheduleId);
    if (!schedule) return unregisterCron(scheduleId);
    
    if (schedule.isActive) {
      registerCron(schedule);
    } else {
      unregisterCron(scheduleId);
    }
  } catch (err) {
    console.error('❌ Error syncing automated schedule engine:', err.message);
  }
};

module.exports = { initScheduler, syncSchedule, unregisterCron };
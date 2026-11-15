// tests/Upstash/integration/cronScheduler.test.js

// 1. INLINE MOCK FOR THE BULL QUEUE TO PREVENT REDIS COMPILATION ERRORS
jest.mock('../../../src/queues/scrapeQueue.js', () => {
  return {
    add: jest.fn().mockResolvedValue({ id: 'mock-cron-job-id' }),
    process: jest.fn(),
    on: jest.fn(),
    getJob: jest.fn().mockResolvedValue(null),
    getJobs: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    empty: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined)
  };
});

// 2. INTERCEPT NODE-CRON BEFORE CONTROLLERS RUN
jest.mock('node-cron', () => {
  const actualCron = jest.requireActual('node-cron');
  return {
    validate: actualCron.validate,
    schedule: jest.fn().mockImplementation((expression, callback) => {
      return {
        stop: jest.fn(),
        _trigger: callback // Expose hook to execute the async queue container manually
      };
    })
  };
});

// 3. SECURE DOWNSTREAM SYSTEM ASSETS
jest.mock('../../../src/services/mail.services.js', () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
  transporter: { verify: jest.fn() }
}));

// Now safely require components without triggering native initialization hooks
const cron = require('node-cron');
const mongoose = require('mongoose');
const ScrapeSchedule = require('../../../src/models/scrapeSchedule.model.js');
const scrapeQueue = require('../../../src/queues/scrapeQueue.js');
const { initScheduler, syncSchedule, unregisterCron } = require('../../../src/schedulers/cronScheduler.js');

describe('CronScheduler Service Suite — 100% Path Coverage', () => {
  let mockUserId, validSchedule;

  beforeEach(async () => {
    await ScrapeSchedule.deleteMany({});
    jest.clearAllMocks();

    mockUserId = new mongoose.Types.ObjectId();

    // Create an initial active document inside the testing database context
    validSchedule = await ScrapeSchedule.create({
      userId: mockUserId,
      engine: 'amazon',
      query: 'automated extraction protocols',
      location: 'us',
      cronExpression: '0 9 * * *',
      isActive: true
    });
  });

  afterAll(async () => {
    await ScrapeSchedule.deleteMany({});
  });

  // ── 1. INITIALIZATION & SETUP PATHS ────────────────────────────────────────
  describe('initScheduler()', () => {
    it('should query active database objects and register them cleanly', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await initScheduler();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Loading 1 active schedules...'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('All schedules registered successfully.'));
      consoleSpy.mockRestore();
    });

    it('should enter the catch block gracefully when a database find query breaks', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const dbSpy = jest.spyOn(ScrapeSchedule, 'find').mockImplementationOnce(() => {
        throw new Error('Database cluster link timed out');
      });

      await initScheduler();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ CronScheduler boot error:',
        'Database cluster link timed out'
      );

      dbSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  // ── 2. VALIDATION & BACKGROUND WORKER EXECUTIONS ──────────────────────────
  describe('registerCron validation & task execution branches', () => {
    it('should clear down historical mapping items if an item ID is updated/re-registered', async () => {
      await syncSchedule(validSchedule._id);
      // Re-triggering synch with the exact same ID tests the overwriting/stopping branch
      await syncSchedule(validSchedule._id);

      expect(cron.schedule).toHaveBeenCalledTimes(2);
    });

    it('should log a warning and return early if a cron expression fails validation', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const malformedSchedule = await ScrapeSchedule.create({
        userId: mockUserId,
        engine: 'indeed',
        query: 'invalid cron syntax payload',
        cronExpression: 'completely-invalid-cron-syntax',
        isActive: true
      });

      await syncSchedule(malformedSchedule._id);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining(`⚠️ Invalid cron expression format assigned to item ID ${malformedSchedule._id}`)
      );
      consoleWarnSpy.mockRestore();
    });

    it('should execute queue injection cleanly when the cron expression triggers', async () => {
      // Register schedule and extract the mock task structure
      await syncSchedule(validSchedule._id);
      const scheduledTaskMock = cron.schedule.mock.results[0].value;

      // Fire the cron callback handler directly to execute the inner try block
      await scheduledTaskMock._trigger();

      expect(scrapeQueue.add).toHaveBeenCalledWith(
        expect.objectContaining({
          engine: 'amazon',
          query: 'automated extraction protocols',
          location: 'us',
          userId: mockUserId,
          scheduleId: validSchedule._id.toString()
        }),
        expect.any(Object)
      );
    });

    it('should capture queue ingestion faults cleanly when jobs fail to enqueue', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      // Break the queue mechanism for one execution iteration
      scrapeQueue.add.mockRejectedValueOnce(new Error('Redis cluster memory limits reached'));

      await syncSchedule(validSchedule._id);
      const scheduledTaskMock = cron.schedule.mock.results[0].value;

      await scheduledTaskMock._trigger();

      // Assert that the log matching the prefix was called along with its secondary error message payload
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(`❌ Failed to inject automatic task into queue context layer ${validSchedule._id}`),
        'Redis cluster memory limits reached'
      );

      consoleErrorSpy.mockRestore();
    });

    it('should exit quietly if an evaluation profile does not match parameter criteria', async () => {
      // Call with an uninstantiated model structure directly
      await syncSchedule(new mongoose.Types.ObjectId());
    });
  });

  // ── 3. SYNCHRONIZATION & LIFECYCLE LIFTS ───────────────────────────────────
  describe('syncSchedule() and unregisterCron() branches', () => {
    it('should unregister and stop an operational scheduler if it is toggled off', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      // Step A: Load it up as active so it populates inside activeCrons Map
      await syncSchedule(validSchedule._id);

      // Step B: Update it to inactive in the database
      validSchedule.isActive = false;
      await validSchedule.save();

      // Step C: Synchronize again to force the unregister sequence layout
      await syncSchedule(validSchedule._id);

      expect(consoleSpy).toHaveBeenCalledWith(
        `🛑 Cron stopped for schedule identifier: ${validSchedule._id}`
      );
      consoleSpy.mockRestore();
    });

    it('should print a terminal description exception when syncSchedule throws an error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const dbSpy = jest.spyOn(ScrapeSchedule, 'findById').mockImplementationOnce(() => {
        throw new Error('BSON Object compilation serialization panic');
      });

      await syncSchedule(validSchedule._id);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ Error syncing automated schedule engine:',
        'BSON Object compilation serialization panic'
      );

      dbSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should pass validation safely and ignore clean unregister commands missing IDs', async () => {
      expect(() => unregisterCron(null)).not.toThrow();
      expect(() => unregisterCron(undefined)).not.toThrow();
    });
  });
});

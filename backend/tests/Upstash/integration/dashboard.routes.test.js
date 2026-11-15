
// tests/Upstash/integration/dashboard.routes.test.js
require('../setup/mockRedis.js');

jest.mock('../../../src/queues/scrapeQueue.js', () => ({
  add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
  process: jest.fn(),
  on: jest.fn(),
  getJob: jest.fn().mockResolvedValue(null),
  getJobs: jest.fn().mockResolvedValue([]),
  count: jest.fn().mockResolvedValue(0),
  getWaitingCount: jest.fn().mockResolvedValue(0),
  getActiveCount: jest.fn().mockResolvedValue(0),
  getCompletedCount: jest.fn().mockResolvedValue(0),
  getFailedCount: jest.fn().mockResolvedValue(0),
  empty: jest.fn().mockResolvedValue(undefined),
  close: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('../../../src/services/mail.services.js', () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
  transporter: { verify: jest.fn() }
}));

// Mock cron scheduler functions to avoid running real loops or throwing unexpected errors
jest.mock('../../../src/schedulers/cronScheduler.js', () => ({
  syncSchedule: jest.fn().mockResolvedValue(true),
  unregisterCron: jest.fn().mockReturnValue(true)
}));

const request  = require('supertest');
const app      = require('../../../src/app.js');
const User     = require('../../../src/models/user.model.js');
const Post     = require('../../../src/models/post.model.js');
const ScrapeSchedule = require('../../../src/models/scrapeSchedule.model.js');
const scrapeQueue = require('../../../src/queues/scrapeQueue.js');

describe('Dashboard Routes Integration', () => {
  let authToken, user;

  beforeEach(async () => {
    scrapeQueue.getWaitingCount.mockResolvedValue(0);
    scrapeQueue.getActiveCount.mockResolvedValue(0);
    scrapeQueue.getCompletedCount.mockResolvedValue(0);
    scrapeQueue.getFailedCount.mockResolvedValue(0);
    await User.deleteMany({});
    await Post.deleteMany({});
    await ScrapeSchedule.deleteMany({});

    user = await User.create({
      username: 'dashuser',
      email: 'dash@test.com',
      password: 'password123'
    });
    authToken = user.generateAuthToken();
  });

  // ── Auth guard ────────────────────────────────────────────────────────────
  it('returns 401 on telemetry without auth', async () => {
    const res = await request(app).get('/api/v1/dashboard/telemetry');
    expect(res.status).toBe(401);
  });

  it('returns 401 on tasks without auth', async () => {
    const res = await request(app).get('/api/v1/dashboard/tasks');
    expect(res.status).toBe(401);
  });

  // ── Telemetry ─────────────────────────────────────────────────────────────
  describe('GET /api/v1/dashboard/telemetry', () => {
    it('returns 200 with correct shape', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/telemetry')
        .set('Cookie', `token=${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('totalHarvested');
      expect(res.body).toHaveProperty('systemHealth');
      expect(res.body.systemHealth).toHaveProperty('memory');
      expect(res.body).toHaveProperty('queuedTasks');
      expect(res.body.recordsBySource).toEqual({
        amazon: 0,
        indeed: 0,
        booking: 0,
        news: 0
      });
      expect(res.body.successRate).toBeNull();
      expect(res.body).not.toHaveProperty('bandwidth');
    });

    it('totalHarvested is a number', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/telemetry')
        .set('Cookie', `token=${authToken}`);
      expect(typeof res.body.totalHarvested).toBe('number');
    });

    it('calculates success rate from completed and failed jobs', async () => {
      scrapeQueue.getCompletedCount.mockResolvedValue(3);
      scrapeQueue.getFailedCount.mockResolvedValue(1);

      const res = await request(app)
        .get('/api/v1/dashboard/telemetry')
        .set('Cookie', `token=${authToken}`);

      expect(res.body.successRate).toBe(75);
    });

    it('reports queue failures instead of displaying invented zero counts', async () => {
      scrapeQueue.getWaitingCount.mockRejectedValueOnce(new Error('Redis unavailable'));

      const res = await request(app)
        .get('/api/v1/dashboard/telemetry')
        .set('Cookie', `token=${authToken}`);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ── Tasks ─────────────────────────────────────────────────────────────────
  describe('GET /api/v1/dashboard/tasks', () => {
    it('returns 200 with data array', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/tasks')
        .set('Cookie', `token=${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ── Task control ──────────────────────────────────────────────────────────
  describe('POST /api/v1/dashboard/tasks/control', () => {
    it('returns 400 when jobId or action missing', async () => {
      const res = await request(app)
        .post('/api/v1/dashboard/tasks/control')
        .set('Cookie', `token=${authToken}`)
        .send({ jobId: 'JOB-1' }); // missing action
      expect(res.status).toBe(400);
    });

    it('returns 404 for non-existent job', async () => {
      const res = await request(app)
        .post('/api/v1/dashboard/tasks/control')
        .set('Cookie', `token=${authToken}`)
        .send({ jobId: 'JOB-99999', action: 'kill' });
      expect(res.status).toBe(404);
    });

    it('rejects unsupported per-task pause controls', async () => {
      const res = await request(app)
        .post('/api/v1/dashboard/tasks/control')
        .set('Cookie', `token=${authToken}`)
        .send({ jobId: 'JOB-1', action: 'pause' });
      expect(res.status).toBe(400);
    });
  });

  // ── Schedules CRUD ────────────────────────────────────────────────────────
  describe('Schedules', () => {
    it('GET /schedules returns empty array initially', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/schedules')
        .set('Cookie', `token=${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it('POST /schedules creates a schedule', async () => {
      const res = await request(app)
        .post('/api/v1/dashboard/schedules')
        .set('Cookie', `token=${authToken}`)
        .send({ engine: 'indeed', query: 'ml engineer', location: 'remote', cronExpression: '0 9 * * *' });
      expect(res.status).toBe(201);
      expect(res.body.data.engine).toBe('indeed');
      expect(res.body.data.query).toBe('ml engineer');
    });

    it('POST /schedules returns 400 for missing engine', async () => {
      const res = await request(app)
        .post('/api/v1/dashboard/schedules')
        .set('Cookie', `token=${authToken}`)
        .send({ query: 'dev', cronExpression: '0 9 * * *' });
      expect(res.status).toBe(400);
    });

    it('does not create unsupported Booking schedules', async () => {
      const res = await request(app)
        .post('/api/v1/dashboard/schedules')
        .set('Cookie', `token=${authToken}`)
        .send({ engine: 'booking', query: 'paris', cronExpression: '0 9 * * *' });

      expect(res.status).toBe(400);
    });

    it('requires a location for scheduled Indeed searches', async () => {
      const res = await request(app)
        .post('/api/v1/dashboard/schedules')
        .set('Cookie', `token=${authToken}`)
        .send({ engine: 'indeed', query: 'developer', cronExpression: '0 9 * * *' });

      expect(res.status).toBe(400);
    });

    it('GET /schedules returns created schedule', async () => {
      await request(app)
        .post('/api/v1/dashboard/schedules')
        .set('Cookie', `token=${authToken}`)
        .send({ engine: 'amazon', query: 'nodejs', cronExpression: '0 */6 * * *' });

      const res = await request(app)
        .get('/api/v1/dashboard/schedules')
        .set('Cookie', `token=${authToken}`);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].query).toBe('nodejs');
    });

    it('PUT /schedules/:id toggles isActive', async () => {
      const createRes = await request(app)
        .post('/api/v1/dashboard/schedules')
        .set('Cookie', `token=${authToken}`)
        .send({
          engine: 'indeed',
          query: 'devops',
          location: 'remote',
          cronExpression: '0 9 * * 1'
        });
      const id = createRes.body.data._id;

      const updateRes = await request(app)
        .put(`/api/v1/dashboard/schedules/${id}`)
        .set('Cookie', `token=${authToken}`)
        .send({ isActive: false });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.isActive).toBe(false);
    });

    it('DELETE /schedules/:id removes the schedule', async () => {
      const createRes = await request(app)
        .post('/api/v1/dashboard/schedules')
        .set('Cookie', `token=${authToken}`)
        .send({ engine: 'amazon', query: 'paris', cronExpression: '0 9 * * *' });
      const id = createRes.body.data._id;

      const deleteRes = await request(app)
        .delete(`/api/v1/dashboard/schedules/${id}`)
        .set('Cookie', `token=${authToken}`);
      expect(deleteRes.status).toBe(200);

      const getRes = await request(app)
        .get('/api/v1/dashboard/schedules')
        .set('Cookie', `token=${authToken}`);
      expect(getRes.body.data).toHaveLength(0);
    });

    it('DELETE returns 404 for non-existent schedule', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const res = await request(app)
        .delete(`/api/v1/dashboard/schedules/${fakeId}`)
        .set('Cookie', `token=${authToken}`);
      expect(res.status).toBe(404);
    });
  });

  it('does not expose removed placeholder pages as API endpoints', async () => {
    const settings = await request(app)
      .get('/api/v1/dashboard/settings')
      .set('Cookie', `token=${authToken}`);
    const proxies = await request(app)
      .get('/api/v1/dashboard/proxies')
      .set('Cookie', `token=${authToken}`);

    expect(settings.status).toBe(404);
    expect(proxies.status).toBe(404);
  });

  // ── Advanced Path/Branch Coverage Metrics ──────────────────────────────────
  describe('Error Catch Blocks & Missing Threshold Paths', () => {
    it('should catch runtime exceptions inside getSchedules and return 500', async () => {
      const spy = jest.spyOn(ScrapeSchedule, 'find').mockImplementationOnce(() => {
        throw new Error('Simulated schedule database crash');
      });

      const res = await request(app)
        .get('/api/v1/dashboard/schedules')
        .set('Cookie', `token=${authToken}`);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Simulated schedule database crash');
      spy.mockRestore();
    });

    it('should catch runtime exceptions inside createSchedule and return 500', async () => {
      const spy = jest.spyOn(ScrapeSchedule, 'create').mockImplementationOnce(() => {
        throw new Error('Simulated scheduling engine structural failure');
      });

      const res = await request(app)
        .post('/api/v1/dashboard/schedules')
        .set('Cookie', `token=${authToken}`)
        .send({
          engine: 'amazon',
          query: 'test metrics',
          cronExpression: '*/5 * * * *'
        });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Simulated scheduling engine structural failure');
      spy.mockRestore();
    });

    it('should handle malformed ObjectIds triggering updateSchedule catch block directly', async () => {
      const res = await request(app)
        .put('/api/v1/dashboard/schedules/completely-invalid-bson-objectid-format')
        .set('Cookie', `token=${authToken}`)
        .send({ isActive: true });

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error');
    });

    it('should handle malformed ObjectIds triggering deleteSchedule catch block directly', async () => {
      const res = await request(app)
        .delete('/api/v1/dashboard/schedules/completely-invalid-bson-objectid-format')
        .set('Cookie', `token=${authToken}`);

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error');
    });

    // Target: controlTask missing configuration / invalid parameter flow (Lines 99-100)
    it('should drop with bad request code when task control payloads are structurally invalid', async () => {
      const res = await request(app)
        .post('/api/v1/dashboard/tasks/control')
        .set('Cookie', `token=${authToken}`)
        .send({ action: 'pause' }); // Missing jobId completely

      expect(res.status).toBe(400);
    });

    // Target: controlTask catch block via Queue exception mapping (Lines 116-124)
    // Target: controlTask catch block via Queue exception mapping (Lines 116-124)
    it('should handle runtime driver failures inside controlTask queue management gracefully', async () => {
      const scrapeQueue = require('../../../src/queues/scrapeQueue.js');
      const spy = jest.spyOn(scrapeQueue, 'getJob').mockImplementationOnce(() => {
        throw new Error('Redis instance isolation network drop');
      });

      const res = await request(app)
        .post('/api/v1/dashboard/tasks/control')
        .set('Cookie', `token=${authToken}`)
        .send({ jobId: 'mock-job-id', action: 'kill' });

      expect(res.status).toBe(500);
      // FIX: Check for the exact property name (.error) and message that the controller returns
      expect(res.body.error).toBe('Redis instance isolation network drop');
      spy.mockRestore();
    });
  });
});

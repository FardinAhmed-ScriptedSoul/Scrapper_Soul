require('../setup/mockRedis.js');

jest.mock('../../../src/queues/scrapeQueue.js', () => ({
  add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
  process: jest.fn(),
  on: jest.fn(),
  getJob: jest.fn().mockResolvedValue(null),
  getJobs: jest.fn().mockResolvedValue([]),
  getWaitingCount: jest.fn().mockResolvedValue(0),
  getActiveCount: jest.fn().mockResolvedValue(0),
  getCompletedCount: jest.fn().mockResolvedValue(0),
  getFailedCount: jest.fn().mockResolvedValue(0),
  count: jest.fn().mockResolvedValue(0),
  close: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('../../../src/services/mail.services.js', () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
  transporter: { verify: jest.fn() }
}));

jest.mock('../../../src/schedulers/cronScheduler.js', () => ({
  syncSchedule: jest.fn().mockResolvedValue(true),
  unregisterCron: jest.fn().mockReturnValue(true)
}));

jest.mock('../../../src/workers/feedWorker.js', () => ({
  runMasterPipeline: jest.fn().mockResolvedValue(undefined),
  isFeedPipelineRunning: jest.fn().mockReturnValue(false)
}));

const request = require('supertest');
const app = require('../../../src/app.js');
const User = require('../../../src/models/user.model.js');
const FeedSourceStatus = require('../../../src/models/feedSourceStatus.model.js');
const { FEED_SOURCES } = require('../../../src/config/feedSources.js');
const feedWorker = require('../../../src/workers/feedWorker.js');

describe('Feed Status Routes Integration', () => {
  let authToken;

  beforeEach(async () => {
    await Promise.all([User.deleteMany({}), FeedSourceStatus.deleteMany({})]);
    feedWorker.runMasterPipeline.mockClear();
    feedWorker.isFeedPipelineRunning.mockReturnValue(false);
    const user = await User.create({
      username: 'feedstatususer',
      email: 'feedstatus@test.com',
      password: 'password123'
    });
    authToken = user.generateAuthToken();
  });

  it('requires authentication', async () => {
    const response = await request(app).get('/api/v1/feeds');
    expect(response.status).toBe(401);
  });

  it('returns the configured sources and explicit last-run failures', async () => {
    const source = FEED_SOURCES[0];
    await FeedSourceStatus.create({
      sourceId: source.id,
      name: source.name,
      provider: source.provider,
      url: source.url,
      category: source.category,
      status: 'failed',
      lastStartedAt: new Date('2025-03-01T10:00:00.000Z'),
      lastFinishedAt: new Date('2025-03-01T10:00:05.000Z'),
      lastError: 'RSS provider unavailable',
      lastItemCount: 0,
      lastNewCount: 0,
      durationMs: 5000
    });

    const response = await request(app)
      .get('/api/v1/feeds')
      .set('Cookie', `token=${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.sources).toHaveLength(FEED_SOURCES.length);
    expect(response.body.data.sources[0]).toMatchObject({
      id: source.id,
      provider: source.provider,
      category: source.category,
      status: 'failed',
      lastError: 'RSS provider unavailable',
      lastItemCount: 0
    });
    expect(response.body.data.sources[1].status).toBe('unknown');
  });

  it('starts an authenticated refresh and rate-limits a second manual request', async () => {
    const first = await request(app)
      .post('/api/v1/feeds/refresh')
      .set('Cookie', `token=${authToken}`);
    const second = await request(app)
      .post('/api/v1/feeds/refresh')
      .set('Cookie', `token=${authToken}`);

    expect(first.status).toBe(202);
    expect(feedWorker.runMasterPipeline).toHaveBeenCalledTimes(1);
    expect(second.status).toBe(429);
  });
});

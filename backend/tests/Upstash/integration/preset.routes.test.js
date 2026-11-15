require('../setup/mockRedis.js');

jest.mock('../../../src/queues/scrapeQueue.js', () => ({
  add: jest.fn().mockResolvedValue({ id: 'preset-job-1' }),
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

const request = require('supertest');
const app = require('../../../src/app.js');
const User = require('../../../src/models/user.model.js');
const SavedSearchPreset = require('../../../src/models/savedSearchPreset.model.js');
const scrapeQueue = require('../../../src/queues/scrapeQueue.js');

describe('Saved Search Presets Integration', () => {
  let user;
  let authToken;

  beforeEach(async () => {
    await Promise.all([User.deleteMany({}), SavedSearchPreset.deleteMany({})]);
    scrapeQueue.add.mockClear();
    user = await User.create({
      username: 'presetuser',
      email: 'presets@test.com',
      password: 'password123'
    });
    authToken = user.generateAuthToken();
  });

  it('requires authentication', async () => {
    const response = await request(app).get('/api/v1/presets');
    expect(response.status).toBe(401);
  });

  it('creates validated presets and lists only the signed-in user records', async () => {
    const created = await request(app)
      .post('/api/v1/presets')
      .set('Cookie', `token=${authToken}`)
      .send({ name: 'Remote roles', engine: 'indeed', query: 'Platform Engineer', location: 'Remote' });

    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({
      name: 'Remote roles',
      engine: 'indeed',
      query: 'platform engineer',
      location: 'remote'
    });

    const otherUser = await User.create({
      username: 'otherpresetuser',
      email: 'other-presets@test.com',
      password: 'password123'
    });
    await SavedSearchPreset.create({
      userId: otherUser._id,
      name: 'Other search',
      engine: 'amazon',
      query: 'books'
    });
    const list = await request(app)
      .get('/api/v1/presets')
      .set('Cookie', `token=${authToken}`);

    expect(list.status).toBe(200);
    expect(list.body.data.map((preset) => preset.name)).toEqual(['Remote roles']);
  });

  it('requires engine-specific Indeed and Booking fields', async () => {
    const missingLocation = await request(app)
      .post('/api/v1/presets')
      .set('Cookie', `token=${authToken}`)
      .send({ name: 'Indeed search', engine: 'indeed', query: 'developer' });
    const invalidStay = await request(app)
      .post('/api/v1/presets')
      .set('Cookie', `token=${authToken}`)
      .send({
        name: 'Hotel search',
        engine: 'booking',
        query: 'Paris',
        checkIn: '2025-03-08',
        checkOut: '2025-03-08'
      });
    const validStay = await request(app)
      .post('/api/v1/presets')
      .set('Cookie', `token=${authToken}`)
      .send({
        name: 'Paris stay',
        engine: 'booking',
        query: 'Paris',
        checkIn: '2025-03-08',
        checkOut: '2025-03-10'
      });

    expect(missingLocation.status).toBe(400);
    expect(invalidStay.status).toBe(400);
    expect(validStay.status).toBe(201);
  });

  it('updates and deletes only presets owned by the current user', async () => {
    const preset = await SavedSearchPreset.create({
      userId: user._id,
      name: 'Books',
      engine: 'amazon',
      query: 'python'
    });
    const otherUser = await User.create({
      username: 'anotherpresetuser',
      email: 'another-presets@test.com',
      password: 'password123'
    });
    const foreignPreset = await SavedSearchPreset.create({
      userId: otherUser._id,
      name: 'Other books',
      engine: 'amazon',
      query: 'database'
    });

    const update = await request(app)
      .put(`/api/v1/presets/${preset._id}`)
      .set('Cookie', `token=${authToken}`)
      .send({ name: 'Updated books', engine: 'amazon', query: 'node' });
    const deniedUpdate = await request(app)
      .put(`/api/v1/presets/${foreignPreset._id}`)
      .set('Cookie', `token=${authToken}`)
      .send({ name: 'Claimed', engine: 'amazon', query: 'node' });
    const deniedDelete = await request(app)
      .delete(`/api/v1/presets/${foreignPreset._id}`)
      .set('Cookie', `token=${authToken}`);
    const ownedDelete = await request(app)
      .delete(`/api/v1/presets/${preset._id}`)
      .set('Cookie', `token=${authToken}`);

    expect(update.status).toBe(200);
    expect(update.body.data.query).toBe('node');
    expect(deniedUpdate.status).toBe(404);
    expect(deniedDelete.status).toBe(404);
    expect(ownedDelete.status).toBe(200);
  });

  it('queues a run with the validated search inputs and user owner', async () => {
    const preset = await SavedSearchPreset.create({
      userId: user._id,
      name: 'Stay search',
      engine: 'booking',
      query: 'paris',
      checkIn: '2026-07-01',
      checkOut: '2026-07-05'
    });

    const response = await request(app)
      .post(`/api/v1/presets/${preset._id}/run`)
      .set('Cookie', `token=${authToken}`);

    expect(response.status).toBe(202);
    expect(response.body.data.jobId).toBe('preset-job-1');
    expect(scrapeQueue.add).toHaveBeenCalledWith(
      expect.objectContaining({
        engine: 'booking',
        query: 'paris',
        checkIn: '2026-07-01',
        checkOut: '2026-07-05',
        userId: user._id
      }),
      expect.any(Object)
    );
  });
});

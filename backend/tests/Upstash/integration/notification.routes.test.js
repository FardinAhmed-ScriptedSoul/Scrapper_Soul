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

const request = require('supertest');
const app = require('../../../src/app.js');
const User = require('../../../src/models/user.model.js');

describe('Notification Preferences Integration', () => {
  let user;
  let authToken;

  beforeEach(async () => {
    await User.deleteMany({});
    user = await User.create({
      username: 'notificationuser',
      email: 'notifications@test.com',
      password: 'password123'
    });
    authToken = user.generateAuthToken();
  });

  it('requires authentication', async () => {
    const response = await request(app).get('/api/v1/notifications/preferences');
    expect(response.status).toBe(401);
  });

  it('defaults to opt-out while retaining event selections', async () => {
    const response = await request(app)
      .get('/api/v1/notifications/preferences')
      .set('Cookie', `token=${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      enabled: false,
      events: { completed: true, failed: true }
    });
  });

  it('saves preferences only for the signed-in user', async () => {
    const otherUser = await User.create({
      username: 'othernotificationuser',
      email: 'other-notifications@test.com',
      password: 'password123'
    });
    const response = await request(app)
      .put('/api/v1/notifications/preferences')
      .set('Cookie', `token=${authToken}`)
      .send({ enabled: true, events: { completed: false, failed: true } });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      enabled: true,
      events: { completed: false, failed: true }
    });
    expect((await User.findById(otherUser._id)).notificationPreferences.enabled).toBe(false);
  });

  it('rejects incomplete or non-boolean preferences', async () => {
    const response = await request(app)
      .put('/api/v1/notifications/preferences')
      .set('Cookie', `token=${authToken}`)
      .send({ enabled: 'yes', events: { completed: true } });

    expect(response.status).toBe(400);
  });
});

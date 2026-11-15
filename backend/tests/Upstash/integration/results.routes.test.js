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
const AmazonBook = require('../../../src/models/amazon.model.js');
const IndeedJob = require('../../../src/models/indeed.model.js');
const BookingHotel = require('../../../src/models/booking.model.js');
const Post = require('../../../src/models/post.model.js');

describe('Saved Results Routes Integration', () => {
  let authToken;
  let user;

  beforeEach(async () => {
    await Promise.all([
      User.deleteMany({}),
      AmazonBook.deleteMany({}),
      IndeedJob.deleteMany({}),
      BookingHotel.deleteMany({}),
      Post.deleteMany({})
    ]);

    user = await User.create({
      username: 'resultsuser',
      email: 'results@test.com',
      password: 'password123'
    });
    authToken = user.generateAuthToken();

    await AmazonBook.create([
      {
        userId: user._id,
        searchTerm: 'cloud',
        title: 'Cloud Systems',
        productUrl: 'https://example.com/cloud',
        createdAt: new Date('2025-03-02T12:00:00.000Z')
      },
      {
        userId: user._id,
        searchTerm: 'databases',
        title: 'Database Design',
        productUrl: 'https://example.com/database',
        createdAt: new Date('2025-03-01T12:00:00.000Z')
      },
      {
        userId: new User()._id,
        searchTerm: 'cloud',
        title: 'Private Cloud',
        productUrl: 'https://example.com/private',
        createdAt: new Date('2025-03-04T12:00:00.000Z')
      }
    ]);
    await IndeedJob.create({
      userId: user._id,
      jobTitleQuery: 'engineer',
      locationQuery: 'remote',
      title: 'Platform Engineer',
      company: 'Example Inc',
      jobUrl: 'https://example.com/job',
      createdAt: new Date('2025-03-03T12:00:00.000Z')
    });
  });

  it('requires authentication', async () => {
    const response = await request(app).get('/api/v1/results');
    expect(response.status).toBe(401);
  });

  it('returns owner-scoped results in chronological pages', async () => {
    const firstPage = await request(app)
      .get('/api/v1/results?limit=2&page=1')
      .set('Cookie', `token=${authToken}`);

    expect(firstPage.status).toBe(200);
    expect(firstPage.body.pagination).toEqual({
      page: 1,
      limit: 2,
      total: 3,
      totalPages: 2
    });
    expect(firstPage.body.data.map((record) => record.title)).toEqual([
      'Platform Engineer',
      'Cloud Systems'
    ]);
    expect(firstPage.body.data.map((record) => record.source)).toEqual(['indeed', 'amazon']);
    expect(firstPage.body.data.some((record) => record.title === 'Private Cloud')).toBe(false);

    const secondPage = await request(app)
      .get('/api/v1/results?limit=2&page=2')
      .set('Cookie', `token=${authToken}`);

    expect(secondPage.body.data.map((record) => record.title)).toEqual(['Database Design']);
  });

  it('filters by source, text, and inclusive date range', async () => {
    const response = await request(app)
      .get('/api/v1/results?source=amazon&q=cloud&from=2025-03-02&to=2025-03-02')
      .set('Cookie', `token=${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.pagination.total).toBe(1);
    expect(response.body.data[0]).toMatchObject({
      source: 'amazon',
      title: 'Cloud Systems',
      summary: 'cloud',
      url: 'https://example.com/cloud'
    });
  });

  it('includes owned Booking records and shared news posts', async () => {
    await BookingHotel.create({
      userId: user._id,
      destinationQuery: 'paris',
      checkInDate: '2025-03-05',
      checkOutDate: '2025-03-08',
      hotelName: 'Paris Hotel',
      hotelUrl: 'https://example.com/hotel',
      createdAt: new Date('2025-03-05T12:00:00.000Z')
    });
    await Post.create({
      category: 'tech',
      title: 'Shared feed story',
      contentSummary: 'Feed summary',
      sourceName: 'Example News',
      sourceUrl: 'https://example.com/news',
      uniqueGuid: 'saved-results-news',
      publishedAt: new Date('2025-03-06T12:00:00.000Z')
    });

    const response = await request(app)
      .get('/api/v1/results?limit=100')
      .set('Cookie', `token=${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.pagination.total).toBe(5);
    expect(response.body.data.find((record) => record.source === 'booking')).toMatchObject({
      title: 'Paris Hotel',
      fields: { checkInDate: '2025-03-05', checkOutDate: '2025-03-08' }
    });
    expect(response.body.data.find((record) => record.source === 'news')).toMatchObject({
      title: 'Shared feed story',
      summary: 'Feed summary',
      url: 'https://example.com/news'
    });
  });

  it('rejects invalid filters and pagination', async () => {
    const invalidSource = await request(app)
      .get('/api/v1/results?source=proxy')
      .set('Cookie', `token=${authToken}`);
    const invalidDate = await request(app)
      .get('/api/v1/results?from=2025-02-30')
      .set('Cookie', `token=${authToken}`);
    const excessiveLimit = await request(app)
      .get('/api/v1/results?limit=101')
      .set('Cookie', `token=${authToken}`);

    expect(invalidSource.status).toBe(400);
    expect(invalidDate.status).toBe(400);
    expect(excessiveLimit.status).toBe(400);
  });
});

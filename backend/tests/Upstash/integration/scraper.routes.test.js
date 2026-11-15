// tests/integration/scraper.routes.test.js

// jest.mock() calls are HOISTED by Babel/Jest above all require() statements.
require('../setup/mockRedis.js');

// ── Mock Bull queue ───────────────────────────────────────────────────────────
jest.mock('../../../src/queues/scrapeQueue.js', () => ({
  add:               jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
  process:           jest.fn(),
  on:                jest.fn(),
  getJob:            jest.fn().mockResolvedValue(null),
  getJobs:           jest.fn().mockResolvedValue([]),
  getWaitingCount:   jest.fn().mockResolvedValue(0),
  getActiveCount:    jest.fn().mockResolvedValue(0),
  getCompletedCount: jest.fn().mockResolvedValue(0),
  getFailedCount:    jest.fn().mockResolvedValue(0),
  count:             jest.fn().mockResolvedValue(0),
  close:             jest.fn().mockResolvedValue(undefined)
}));

// ── Mock mail ─────────────────────────────────────────────────────────────────
jest.mock('../../../src/services/mail.services.js', () => ({
  sendEmail:   jest.fn().mockResolvedValue(true),
  transporter: { verify: jest.fn() }
}));

// ── Mock child_process.spawn ──────────────────────────────────────────────────
jest.mock('child_process', () => ({ spawn: jest.fn() }));

// ── Mock rate limiter ─────────────────────────────────────────────────────────
jest.mock('../../../src/middleware/scraperLimit.middleware.js', () =>
  (req, res, next) => next()
);

// ── Intercept playwright and cheerio at the Node module cache level ─────────
beforeAll(() => {
  const mockPage = {
    goto:           jest.fn().mockResolvedValue(undefined),
    waitForTimeout: jest.fn().mockResolvedValue(undefined),
    content:        jest.fn().mockResolvedValue('<div id="salaryInfoAndJobType"><span>$140,000</span></div>'),
    close:          jest.fn().mockResolvedValue(undefined)
  };
  const mockContext = {
    newPage: jest.fn().mockResolvedValue(mockPage)
  };
  const mockBrowser = {
    newContext: jest.fn().mockResolvedValue(mockContext),
    close:      jest.fn().mockResolvedValue(undefined)
  };
  require.cache[require.resolve('playwright')] = {
    id:       require.resolve('playwright'),
    filename: require.resolve('playwright'),
    loaded:   true,
    exports:  { chromium: { launch: jest.fn().mockResolvedValue(mockBrowser) } }
  };

  const mockCheerioInstance = jest.fn().mockReturnValue({
    first: jest.fn().mockReturnValue({
      text: jest.fn().mockReturnValue('$140,000')
    })
  });
  mockCheerioInstance.load = jest.fn().mockReturnValue(mockCheerioInstance);
  require.cache[require.resolve('cheerio')] = {
    id:       require.resolve('cheerio'),
    filename: require.resolve('cheerio'),
    loaded:   true,
    exports:  { load: jest.fn().mockReturnValue(mockCheerioInstance) }
  };
});

afterAll(() => {
  delete require.cache[require.resolve('playwright')];
  delete require.cache[require.resolve('cheerio')];
});

const { EventEmitter } = require('events');
const { spawn }        = require('child_process');
const request          = require('supertest');
const app              = require('../../../src/app.js');
const User             = require('../../../src/models/user.model.js');
const AmazonBook       = require('../../../src/models/amazon.model.js');
const IndeedJob        = require('../../../src/models/indeed.model.js');
const BookingHotel     = require('../../../src/models/booking.model.js');
const Post             = require('../../../src/models/post.model.js');

const flushAsync = () => new Promise(resolve => setTimeout(resolve, 300));

// ── Spawn helpers ─────────────────────────────────────────────────────────────
// ✅ Use 100ms delay — gives controller time to register close listener
const mockSpawnSuccess = (outputData) => {
  const proc = new EventEmitter();
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  setTimeout(() => {
    proc.stdout.emit('data', typeof outputData === 'string' ? outputData : JSON.stringify(outputData));
    proc.emit('close', 0);
  }, 100);
  return proc;
};

const mockSpawnFail = () => {
  const proc = new EventEmitter();
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  setTimeout(() => {
    proc.stderr.emit('data', 'bot detection triggered');
    proc.stdout.emit('data', '');
    proc.emit('close', 1);
  }, 100);
  return proc;
};

const mockSpawnEmpty = () => {
  const proc = new EventEmitter();
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  setTimeout(() => {
    proc.stdout.emit('data', '');
    proc.emit('close', 0);
  }, 100);
  return proc;
};

// ── Payloads ──────────────────────────────────────────────────────────────────
const AMAZON_PAYLOAD = [
  { title: 'Python Book', price: 29.99, rating: 4.5, productUrl: 'https://amazon.com/p/1', authors: ['Author A'] }
];
const INDEED_PAYLOAD = [
  { title: 'ML Engineer', company: 'Acme', location: 'Remote',
    salaryText: '$120,000 a year', benefits: ['401(k)'],
    jobUrl: 'https://www.indeed.com/viewjob?jk=abc123' }
];
const BOOKING_PAYLOAD = [
  { title: 'Hotel Paris', url: 'https://booking.com/hotel/paris',
    location: 'Paris, France', priceText: '$200/night', rating: 8.5,
    imageUrl: 'https://img.example.com/paris.jpg' }
];

// ─────────────────────────────────────────────────────────────────────────────
describe('Scraper Routes Integration Suite', () => {
  let authToken;
  let authUser;

  beforeEach(async () => {
    await User.deleteMany({});
    await AmazonBook.deleteMany({});
    await IndeedJob.deleteMany({});
    await BookingHotel.deleteMany({});
    await Post.deleteMany({});
    spawn.mockReset();

    authUser = await User.create({
      username: 'scraperuser',
      email:    'scraper@test.com',
      password: 'password123'
    });
    authToken = authUser.generateAuthToken();
  });

  afterEach(async () => {
    await flushAsync();
  });

  // ── Auth guard ────────────────────────────────────────────────────────────
  it('returns 401 on all scrape endpoints without auth', async () => {
    const endpoints = [
      '/api/v1/scrape/amazon?query=python',
      '/api/v1/scrape/indeed?role=dev&location=remote',
      '/api/v1/scrape/booking?destination=paris&checkIn=2026-07-01&checkOut=2026-07-05'
    ];
    for (const url of endpoints) {
      const res = await request(app).get(url);
      expect(res.status).toBe(401);
    }
  });

  // ── Validation guards ──────────────────────────────────────────────────────
  it('returns 400 for /amazon without query param', async () => {
    const res = await request(app)
      .get('/api/v1/scrape/amazon')
      .set('Cookie', `token=${authToken}`);
    expect(res.status).toBe(400);
  });

  it('returns 400 for /indeed without location param', async () => {
    const res = await request(app)
      .get('/api/v1/scrape/indeed?role=engineer')
      .set('Cookie', `token=${authToken}`);
    expect(res.status).toBe(400);
  });

  it('returns 400 for /booking without checkOut', async () => {
    const res = await request(app)
      .get('/api/v1/scrape/booking?destination=paris&checkIn=2026-07-01')
      .set('Cookie', `token=${authToken}`);
    expect(res.status).toBe(400);
  });

  // ── Amazon live scrape & cache ────────────────────────────────────────────
  it('returns 200 with scraped Amazon data', async () => {
    spawn.mockReturnValue(mockSpawnSuccess(AMAZON_PAYLOAD));
    const res = await request(app)
      .get('/api/v1/scrape/amazon?query=python')
      .set('Cookie', `token=${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
  });

  it('returns cached Amazon data on second request', async () => {
    spawn.mockReturnValue(mockSpawnSuccess(AMAZON_PAYLOAD));
    await request(app)
      .get('/api/v1/scrape/amazon?query=python')
      .set('Cookie', `token=${authToken}`);

    await flushAsync();
    spawn.mockReset();

    const res = await request(app)
      .get('/api/v1/scrape/amazon?query=python')
      .set('Cookie', `token=${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.source).toBe('mongodb_cache');
  });

  it('does not return another user\'s cached Amazon records', async () => {
    await AmazonBook.create({
      userId: new User()._id,
      searchTerm: 'python',
      title: 'Private book',
      productUrl: 'https://amazon.com/private'
    });
    spawn.mockReturnValue(mockSpawnSuccess(AMAZON_PAYLOAD));

    const res = await request(app)
      .get('/api/v1/scrape/amazon?query=python')
      .set('Cookie', `token=${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.source).toBe('live_stealth_scraper');
    expect(res.body.data[0].userId).toBe(authUser._id.toString());
  });

  // ── Indeed live scrape & cache ────────────────────────────────────────────
  it('returns 200 with scraped Indeed data', async () => {
    spawn.mockReturnValue(mockSpawnSuccess(INDEED_PAYLOAD));
    const res = await request(app)
      .get('/api/v1/scrape/indeed?role=ml+engineer&location=remote')
      .set('Cookie', `token=${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data[0].title).toBe('ML Engineer');
  });

  it('returns cached Indeed data on second request', async () => {
    spawn.mockReturnValue(mockSpawnSuccess(INDEED_PAYLOAD));
    await request(app)
      .get('/api/v1/scrape/indeed?role=ml+engineer&location=remote')
      .set('Cookie', `token=${authToken}`);

    await flushAsync();
    spawn.mockReset();

    const res = await request(app)
      .get('/api/v1/scrape/indeed?role=ml+engineer&location=remote')
      .set('Cookie', `token=${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.source).toBe('mongodb_cache');
  });

  it('normalizes indeed location aliases (onsite)', async () => {
    spawn.mockReturnValue(mockSpawnSuccess(INDEED_PAYLOAD));
    const res = await request(app)
      .get('/api/v1/scrape/indeed?role=dev&location=on+site')
      .set('Cookie', `token=${authToken}`);
    expect(res.status).toBe(200);
  });

  // ── Booking live scrape ───────────────────────────────────────────────────
  it('returns 200 with scraped Booking data', async () => {
    spawn.mockReturnValue(mockSpawnSuccess(BOOKING_PAYLOAD));
    const res = await request(app)
      .get('/api/v1/scrape/booking?destination=paris&checkIn=2026-07-01&checkOut=2026-07-05')
      .set('Cookie', `token=${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data[0].hotelName).toBe('Hotel Paris');
  });

  // ── Error and branch coverage ─────────────────────────────────────────────
  it('returns 500 when Python exits with non-zero code', async () => {
    spawn.mockReturnValue(mockSpawnFail());
    const res = await request(app)
      .get('/api/v1/scrape/amazon?query=failtest')
      .set('Cookie', `token=${authToken}`);
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });

  it('returns 500 when Python outputs empty string', async () => {
    spawn.mockReturnValue(mockSpawnEmpty());
    const res = await request(app)
      .get('/api/v1/scrape/amazon?query=emptytest')
      .set('Cookie', `token=${authToken}`);
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });

  it('returns 500 when Python outputs malformed unparseable JSON raw data', async () => {
    spawn.mockReturnValue(mockSpawnSuccess("{ breaking-json-stream: true "));
    const res = await request(app)
      .get('/api/v1/scrape/indeed?role=dev&location=remote')
      .set('Cookie', `token=${authToken}`);
    expect(res.status).toBe(500);
    expect(res.body.error).toContain('Failed to parse');
  });

  it('returns 500 when the scraper script internal layer explicitly passes an error block', async () => {
    spawn.mockReturnValue(mockSpawnSuccess({ error: 'Stealth automation agent block identified' }));
    const res = await request(app)
      .get('/api/v1/scrape/indeed?role=dev&location=remote')
      .set('Cookie', `token=${authToken}`);
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Stealth automation agent block identified');
  });

  it('returns 500 when MongoDB validation fails inside an insertMany operational loop', async () => {
    const brokenDbPayload = [{ title: 'Missing required tracking properties' }];
    spawn.mockReturnValue(mockSpawnSuccess(brokenDbPayload));
    const res = await request(app)
      .get('/api/v1/scrape/amazon?query=dbfail')
      .set('Cookie', `token=${authToken}`);
    expect(res.status).toBe(500);
  });

  // ── News Feed Route ────────────────────────────────────────────────────────
  // ✅ Fix 1: Correct route is /api/v1/feed not /api/v1/scrape/newsfeed
  it('returns 400 for news feed request missing its category filter query', async () => {
    const res = await request(app)
      .get('/api/v1/feed')
      .set('Cookie', `token=${authToken}`);
    expect(res.status).toBe(400);
  });

  // ✅ Fix 2: Post.create with all required fields
  it('returns 200 with operational data when matching active entries exist', async () => {
    await Post.create({
      category:   'tech',
      title:      'AI Engineering Core',
      publishedAt: new Date(),
      uniqueGuid:  'test-guid-001',
      sourceUrl:   'https://example.com/ai-engineering',
      sourceName:  'TechBlog'
    });
    const res = await request(app)
      .get('/api/v1/feed?category=tech')
      .set('Cookie', `token=${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
  });
});
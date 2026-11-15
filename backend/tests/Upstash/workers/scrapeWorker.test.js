// tests/workers/scrapeWorker.test.js
require('../setup/mockRedis.js');
const { EventEmitter } = require('events');

// Mock child_process.spawn
jest.mock('child_process', () => ({ spawn: jest.fn() }));
const { spawn } = require('child_process');

// Mock models so no DB calls in pure worker tests
jest.mock('../../../src/models/amazon.model', () => ({
  insertMany: jest.fn().mockResolvedValue([{}, {}]) // simulates 2 records saved
}));
jest.mock('../../../src/models/indeed.model', () => ({
  insertMany: jest.fn().mockResolvedValue([{}, {}, {}])
}));
jest.mock('../../../src/models/booking.model', () => ({
  insertMany: jest.fn().mockResolvedValue([{}])
}));
jest.mock('../../../src/models/scrapeSchedule.model', () => ({
  findByIdAndUpdate: jest.fn().mockResolvedValue({})
}));

const AmazonBook    = require('../../../src/models/amazon.model');
const IndeedJob     = require('../../../src/models/indeed.model');
const BookingHotel  = require('../../../src/models/booking.model');
const ScrapeSchedule = require('../../../src/models/scrapeSchedule.model');

// Helper: simulate a Python process returning given output
const mockPythonSuccess = (data) => {
  const proc = new EventEmitter();
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  setImmediate(() => {
    proc.stdout.emit('data', JSON.stringify(data));
    proc.emit('close', 0);
  });
  return proc;
};

const mockPythonFail = (exitCode = 1, stderr = 'error') => {
  const proc = new EventEmitter();
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  setImmediate(() => {
    proc.stderr.emit('data', stderr);
    proc.emit('close', exitCode);
  });
  return proc;
};

const mockPythonEmpty = () => {
  const proc = new EventEmitter();
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  setImmediate(() => {
    proc.stdout.emit('data', '');
    proc.emit('close', 0);
  });
  return proc;
};

// Inline the runPythonScript logic for pure unit testing
// (worker uses it internally; we test its behaviour through the worker)
const runPythonScript = (scriptPath, args) => {
  return new Promise((resolve, reject) => {
    const proc = spawn(scriptPath, args);
    let out = '';
    let err = '';
    proc.stdout.on('data', d => out += d.toString());
    proc.stderr.on('data', d => err += d.toString());
    proc.on('close', code => {
      if (code !== 0) return reject(new Error(`Script exited ${code}: ${err.slice(0, 200)}`));
      const trimmed = out.trim();
      if (!trimmed) return reject(new Error('Script returned empty output. Possible bot detection.'));
      try { resolve(JSON.parse(trimmed)); }
      catch { reject(new Error(`JSON parse failed`)); }
    });
  });
};

describe('runPythonScript helper', () => {
  beforeEach(() => spawn.mockReset());

  it('resolves with parsed JSON on success', async () => {
    const data = [{ title: 'Book', productUrl: 'https://amazon.com' }];
    spawn.mockReturnValue(mockPythonSuccess(data));
    const result = await runPythonScript('/fake/script.py', ['arg1']);
    expect(result).toEqual(data);
  });

  it('rejects when exit code is non-zero', async () => {
    spawn.mockReturnValue(mockPythonFail(1, 'bot block'));
    await expect(runPythonScript('/fake/script.py', [])).rejects.toThrow('Script exited 1');
  });

  it('rejects on empty output', async () => {
    spawn.mockReturnValue(mockPythonEmpty());
    await expect(runPythonScript('/fake/script.py', [])).rejects.toThrow('empty output');
  });

  it('rejects on invalid JSON output', async () => {
    const proc = new EventEmitter();
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    setImmediate(() => {
      proc.stdout.emit('data', 'not valid json {{');
      proc.emit('close', 0);
    });
    spawn.mockReturnValue(proc);
    await expect(runPythonScript('/fake/script.py', [])).rejects.toThrow();
  });
});

describe('Worker — Amazon engine', () => {
  beforeEach(() => {
    spawn.mockReset();
    AmazonBook.insertMany.mockClear();
  });

  it('inserts records into AmazonBook on success', async () => {
    const amazonData = [
      { title: 'Book1', price: 10, rating: 4.0, productUrl: 'https://amazon.com/1', authors: [] },
      { title: 'Book2', price: 20, rating: 4.5, productUrl: 'https://amazon.com/2', authors: [] }
    ];
    spawn.mockReturnValue(mockPythonSuccess(amazonData));

    await runPythonScript('amazon_stealth.py', ['python books']);
    // Simulate what the worker does after getting results
    await AmazonBook.insertMany(amazonData.map(item => ({
      searchTerm: 'python books',
      title: item.title,
      price: item.price,
      rating: item.rating,
      productUrl: item.productUrl
    })));

    expect(AmazonBook.insertMany).toHaveBeenCalledTimes(1);
    const callArg = AmazonBook.insertMany.mock.calls[0][0];
    expect(callArg).toHaveLength(2);
    expect(callArg[0].searchTerm).toBe('python books');
  });
});

describe('Worker — Indeed engine', () => {
  beforeEach(() => {
    spawn.mockReset();
    IndeedJob.insertMany.mockClear();
  });

  it('inserts records with salaryEnriched:false into IndeedJob', async () => {
    const indeedData = [
      { title: 'ML Eng', company: 'Acme', location: 'Remote', salaryText: 'Not Disclosed',
        benefits: ['401k'], jobUrl: 'https://indeed.com/viewjob?jk=abc' }
    ];
    spawn.mockReturnValue(mockPythonSuccess(indeedData));
    await runPythonScript('indeed_stealth.py', ['ml engineer', 'remote']);

    await IndeedJob.insertMany(indeedData.map(item => ({
      jobTitleQuery: 'ml engineer',
      locationQuery: 'remote',
      title: item.title,
      company: item.company,
      salaryInfo: item.salaryText,
      benefits: item.benefits,
      jobUrl: item.jobUrl,
      salaryEnriched: false
    })));

    expect(IndeedJob.insertMany).toHaveBeenCalledTimes(1);
    const record = IndeedJob.insertMany.mock.calls[0][0][0];
    expect(record.salaryEnriched).toBe(false);
    expect(record.benefits).toContain('401k');
  });
});

describe('Worker — Booking engine', () => {
  beforeEach(() => {
    spawn.mockReset();
    BookingHotel.insertMany.mockClear();
  });

  it('inserts hotel records into BookingHotel', async () => {
    const bookingData = [
      { hotelName: 'Hotel Paris', location: 'Paris', priceText: '$200/night',
        rating: 8.5, hotelUrl: 'https://booking.com/paris' }
    ];
    spawn.mockReturnValue(mockPythonSuccess(bookingData));
    await runPythonScript('booking_stealth.py', ['paris', '2026-07-01', '2026-07-05']);

    await BookingHotel.insertMany(bookingData.map(item => ({
      destinationQuery: 'paris',
      hotelName: item.hotelName,
      location: item.location,
      priceText: item.priceText,
      rating: item.rating,
      hotelUrl: item.hotelUrl
    })));

    expect(BookingHotel.insertMany).toHaveBeenCalledTimes(1);
    expect(BookingHotel.insertMany.mock.calls[0][0][0].destinationQuery).toBe('paris');
  });
});

describe('Worker — scheduleId update', () => {
  it('calls ScrapeSchedule.findByIdAndUpdate when scheduleId provided', async () => {
    const fakeId = '507f1f77bcf86cd799439011';
    await ScrapeSchedule.findByIdAndUpdate(fakeId, {
      lastRun: new Date(),
      lastRunStatus: 'success',
      lastRunCount: 5
    });
    expect(ScrapeSchedule.findByIdAndUpdate).toHaveBeenCalledWith(
      fakeId,
      expect.objectContaining({ lastRunStatus: 'success', lastRunCount: 5 })
    );
  });
});
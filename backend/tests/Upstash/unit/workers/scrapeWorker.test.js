const EventEmitter = require('events');

jest.mock('child_process', () => ({ spawn: jest.fn() }));
jest.mock('../../../../src/queues/scrapeQueue.js', () => ({
  process: jest.fn(),
  on: jest.fn()
}));
jest.mock('../../../../src/services/jobNotification.services.js', () => ({
  registerJobNotifications: jest.fn()
}));
jest.mock('../../../../src/repositories', () => ({
  amazonBooks: { insertMany: jest.fn().mockResolvedValue([]) },
  bookingHotels: { insertMany: jest.fn().mockResolvedValue([{ _id: 'booking-record' }]) },
  indeedJobs: { insertMany: jest.fn().mockResolvedValue([]) },
  scrapeSchedules: { findByIdAndUpdate: jest.fn().mockResolvedValue({}) }
}));

const { spawn } = require('child_process');
const scrapeQueue = require('../../../../src/queues/scrapeQueue.js');
const { bookingHotels } = require('../../../../src/repositories');
const { initWorkerEngine } = require('../../../../src/workers/scrapeWorker.js');

const mockPythonSuccess = (items) => {
  const proc = new EventEmitter();
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  setImmediate(() => {
    proc.stdout.emit('data', JSON.stringify(items));
    proc.emit('close', 0);
  });
  return proc;
};

describe('Scrape worker saved-result ownership', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('persists Booking run inputs, dates, and owner from a queued job', async () => {
    spawn.mockReturnValue(mockPythonSuccess([{
      title: 'Paris Hotel',
      url: 'https://example.com/hotel',
      rating: '8.5',
      imageUrl: 'https://example.com/hotel.jpg'
    }]));
    initWorkerEngine();
    const processJob = scrapeQueue.process.mock.calls[0][0];
    const job = {
      data: {
        engine: 'booking',
        query: 'paris',
        checkIn: '2026-07-01',
        checkOut: '2026-07-05',
        userId: 'owner-id'
      },
      progress: jest.fn().mockResolvedValue(undefined)
    };

    await processJob(job);

    expect(bookingHotels.insertMany).toHaveBeenCalledWith([
      expect.objectContaining({
        userId: 'owner-id',
        destinationQuery: 'paris',
        checkInDate: '2026-07-01',
        checkOutDate: '2026-07-05',
        hotelName: 'Paris Hotel',
        hotelUrl: 'https://example.com/hotel',
        rating: 8.5
      })
    ]);
  });
});

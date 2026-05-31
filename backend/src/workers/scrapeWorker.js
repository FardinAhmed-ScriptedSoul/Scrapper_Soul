
// backend/src/workers/scrapeWorker.js
const path = require('path');
const { spawn } = require('child_process');
const scrapeQueue = require('../queues/scrapeQueue.js'); // Import from clean queue file
const AmazonBook = require('../models/amazon.model.js');
const BookingHotel = require('../models/booking.model.js');
const IndeedJob = require('../models/indeed.model.js');
const ScrapeSchedule = require('../models/scrapeSchedule.model.js');

const pythonExecutable = process.env.PYTHON_EXECUTABLE || 'python';

const SCRIPTS = {
  amazon:  path.resolve(__dirname, '../../../python_scrapers/stealth/amazon_stealth.py'),
  indeed:  path.resolve(__dirname, '../../../python_scrapers/stealth/indeed_stealth.py'),
  booking: path.resolve(__dirname, '../../../python_scrapers/stealth/booking_stealth.py'),
};

const runPythonScript = (scriptPath, args) => {
  return new Promise((resolve, reject) => {
    const proc = spawn(pythonExecutable, [scriptPath, ...args]);
    let out = '';
    let err = '';
    proc.stdout.on('data', (d) => out += d.toString());
    proc.stderr.on('data', (d) => err += d.toString());
    proc.on('close', (code) => {
      if (code !== 0) return reject(new Error(`Script exited ${code}: ${err.slice(0, 200)}`));
      const trimmed = out.trim();
      if (!trimmed) return reject(new Error('Script returned empty output. Possible bot detection.'));
      try {
        resolve(JSON.parse(trimmed));
      } catch {
        reject(new Error(`JSON parse failed. Raw: ${trimmed.slice(0, 200)}`));
      }
    });
  });
};

// Use a distinct function initialization container block
const initWorkerEngine = () => {
  scrapeQueue.process(async (job) => {
    const { engine, query, location, scheduleId } = job.data;
    await job.progress(10);

    const scriptPath = SCRIPTS[engine];
    if (!scriptPath) throw new Error(`Unknown engine: ${engine}`);

    const args = engine === 'amazon'
      ? [query]
      : engine === 'indeed'
        ? [query, location]
        : [query, job.data.checkIn, job.data.checkOut];

    await job.progress(20);
    const items = await runPythonScript(scriptPath, args);

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('Scraper returned no results.');
    }

    await job.progress(60);
    let savedCount = 0;

    if (engine === 'amazon') {
      const records = items.map(item => ({
        searchTerm: query,
        title: item.title || 'Unknown',
        price: item.price,
        rating: item.rating,
        productUrl: item.productUrl || 'https://www.amazon.com'
      }));
      const saved = await AmazonBook.insertMany(records);
      savedCount = saved.length;
    }

    if (engine === 'indeed') {
      const records = items.map(item => ({
        jobTitleQuery: query.toLowerCase(),
        locationQuery: location.toLowerCase(),
        title: item.title || 'Job Opportunity',
        company: item.company || 'N/A',
        location: item.location || 'Remote / Unspecified',
        salaryInfo: item.salaryText || 'Not Disclosed',
        benefits: Array.isArray(item.benefits) ? item.benefits : [],
        jobUrl: item.jobUrl || 'https://www.indeed.com',
        salaryEnriched: false
      }));
      const saved = await IndeedJob.insertMany(records);
      savedCount = saved.length;
    }

    if (engine === 'booking') {
      const records = items.map(item => ({
        destinationQuery: query.toLowerCase(),
        hotelName: item.hotelName || 'Hotel',
        location: item.location || 'Unspecified',
        priceText: item.priceText || 'N/A',
        rating: item.rating || 0,
        hotelUrl: item.hotelUrl || 'https://www.booking.com'
      }));
      const saved = await BookingHotel.insertMany(records);
      savedCount = saved.length;
    }

    await job.progress(90);

    if (scheduleId) {
      await ScrapeSchedule.findByIdAndUpdate(scheduleId, {
        lastRun: new Date(),
        lastRunStatus: 'success',
        lastRunCount: savedCount
      });
    }

    await job.progress(100);
    return { engine, savedCount, query };
  });

  console.log('⚙️ Scrape worker processor registered and listening to queue.');
};

module.exports = { initWorkerEngine };
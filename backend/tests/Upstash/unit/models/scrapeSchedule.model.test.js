// tests/unit/models/scrapeSchedule.model.test.js
require('../../setup/mockRedis.js');
const mongoose = require('mongoose');
const ScrapeSchedule = require('../../../../src/models/scrapeSchedule.model.js');
describe('ScrapeSchedule Model', () => {
  const fakeUserId = new mongoose.Types.ObjectId();
  afterEach(async () => { await ScrapeSchedule.deleteMany({}); });

  it('creates a valid schedule', async () => {
    const s = await ScrapeSchedule.create({
      userId: fakeUserId,
      engine: 'indeed',
      query: 'ml engineer',
      cronExpression: '0 9 * * *'
    });
    expect(s._id).toBeDefined();
    expect(s.isActive).toBe(true);
    expect(s.lastRun).toBeNull();
    expect(s.lastRunStatus).toBeNull();
  });

  it('rejects invalid engine value', async () => {
    await expect(ScrapeSchedule.create({
      userId: fakeUserId,
      engine: 'linkedin', // not in enum
      query: 'dev',
      cronExpression: '0 9 * * *'
    })).rejects.toThrow();
  });

  it('rejects missing cronExpression', async () => {
    await expect(ScrapeSchedule.create({
      userId: fakeUserId,
      engine: 'amazon',
      query: 'python'
    })).rejects.toThrow();
  });

  it('rejects missing query', async () => {
    await expect(ScrapeSchedule.create({
      userId: fakeUserId,
      engine: 'booking',
      cronExpression: '0 9 * * *'
    })).rejects.toThrow();
  });

  it('updates lastRun and lastRunStatus correctly', async () => {
    const s = await ScrapeSchedule.create({
      userId: fakeUserId,
      engine: 'amazon',
      query: 'nodejs',
      cronExpression: '0 */6 * * *'
    });
    const now = new Date();
    await ScrapeSchedule.findByIdAndUpdate(s._id, {
      lastRun: now,
      lastRunStatus: 'success',
      lastRunCount: 15
    });
    const updated = await ScrapeSchedule.findById(s._id);
    expect(updated.lastRunStatus).toBe('success');
    expect(updated.lastRunCount).toBe(15);
  });

  it('rejects invalid lastRunStatus enum', async () => {
    const s = await ScrapeSchedule.create({
      userId: fakeUserId,
      engine: 'indeed',
      query: 'devops',
      cronExpression: '0 9 * * 1'
    });
    await expect(
      ScrapeSchedule.findByIdAndUpdate(s._id, { lastRunStatus: 'unknown' }, { runValidators: true, returnDocument: 'after' })
    ).rejects.toThrow();
  });
});
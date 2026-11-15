// tests/unit/models/indeed.model.test.js
require('../../setup/mockRedis.js');
const IndeedJob = require('../../../../src/models/indeed.model.js');

describe('IndeedJob Model', () => {
  afterEach(async () => { await IndeedJob.deleteMany({}); });

  it('creates a valid job document', async () => {
    const job = await IndeedJob.create({
      jobTitleQuery: 'ml engineer',
      locationQuery: 'remote',
      title: 'ML Engineer',
      company: 'Acme Corp',
      location: 'Remote',
      jobUrl: 'https://www.indeed.com/viewjob?jk=abc123'
    });
    expect(job._id).toBeDefined();
    expect(job.salaryInfo).toBe('Not Disclosed');
    expect(job.salaryEnriched).toBe(false);
    expect(job.benefits).toEqual([]);
  });

  it('rejects missing jobTitleQuery', async () => {
    await expect(IndeedJob.create({
      locationQuery: 'remote',
      title: 'Dev',
      jobUrl: 'https://www.indeed.com'
    })).rejects.toThrow();
  });

  it('rejects missing jobUrl', async () => {
    await expect(IndeedJob.create({
      jobTitleQuery: 'dev',
      locationQuery: 'remote',
      title: 'Dev'
    })).rejects.toThrow();
  });

  it('stores benefits array correctly', async () => {
    const job = await IndeedJob.create({
      jobTitleQuery: 'cloud engineer',
      locationQuery: 'onsite',
      title: 'Cloud Eng',
      jobUrl: 'https://www.indeed.com/viewjob?jk=xyz',
      benefits: ['401(k)', 'Health insurance', 'Paid time off']
    });
    expect(job.benefits).toHaveLength(3);
    expect(job.benefits).toContain('401(k)');
  });

  it('salaryEnriched can be set to true', async () => {
    const job = await IndeedJob.create({
      jobTitleQuery: 'devops',
      locationQuery: 'hybrid',
      title: 'DevOps Engineer',
      jobUrl: 'https://www.indeed.com/viewjob?jk=devops1',
      salaryInfo: '$120,000 a year',
      salaryEnriched: true
    });
    expect(job.salaryEnriched).toBe(true);
    expect(job.salaryInfo).toBe('$120,000 a year');
  });

  it('has compound index on jobTitleQuery + locationQuery', async () => {
    await IndeedJob.init();
    const indexes = await IndeedJob.collection.listIndexes().toArray();
    const hasCompound = indexes.some(index =>
      index.key.jobTitleQuery === 1 && index.key.locationQuery === 1
    );
    expect(hasCompound).toBe(true);
  });
});
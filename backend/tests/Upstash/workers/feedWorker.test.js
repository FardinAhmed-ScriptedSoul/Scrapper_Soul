jest.mock('rss-parser', () => jest.fn().mockImplementation(() => ({
  parseURL: jest.fn()
})));

jest.mock('axios', () => ({
  get: jest.fn().mockResolvedValue({ data: [] })
}));

jest.mock('../../../src/repositories', () => ({
  posts: {
    exists: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({})
  },
  feedSourceStatuses: {
    findOneAndUpdate: jest.fn().mockResolvedValue({})
  }
}));

const Parser = require('rss-parser');
const axios = require('axios');
const { posts, feedSourceStatuses } = require('../../../src/repositories');
const { FEED_SOURCES } = require('../../../src/config/feedSources.js');
const { runMasterPipeline, isFeedPipelineRunning } = require('../../../src/workers/feedWorker.js');

describe('Feed worker source status', () => {
  const parser = Parser.mock.results[0].value;

  beforeEach(() => {
    jest.clearAllMocks();
    parser.parseURL.mockResolvedValue({ items: [] });
    axios.get.mockResolvedValue({ data: [] });
    posts.exists.mockResolvedValue(null);
    posts.create.mockResolvedValue({});
    feedSourceStatuses.findOneAndUpdate.mockResolvedValue({});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('records fetched and newly stored items for each configured source', async () => {
    parser.parseURL.mockImplementation(async (url) => {
      if (url !== FEED_SOURCES[0].url) return { items: [] };
      return {
        items: [{
          guid: 'bbc-story-1',
          title: 'BBC story',
          link: 'https://example.com/story',
          contentSnippet: 'Summary'
        }]
      };
    });

    await runMasterPipeline();

    expect(posts.create).toHaveBeenCalledTimes(1);
    expect(feedSourceStatuses.findOneAndUpdate).toHaveBeenCalledTimes(FEED_SOURCES.length);
    expect(feedSourceStatuses.findOneAndUpdate).toHaveBeenCalledWith(
      { sourceId: FEED_SOURCES[0].id },
      {
        $set: expect.objectContaining({
          status: 'success',
          lastItemCount: 1,
          lastNewCount: 1,
          lastSuccessAt: expect.any(Date)
        })
      },
      expect.objectContaining({ upsert: true })
    );
    expect(isFeedPipelineRunning()).toBe(false);
  });

  it('records source failures and continues synchronizing the remaining feeds', async () => {
    parser.parseURL.mockImplementation((url) => {
      if (url === FEED_SOURCES[0].url) return Promise.reject(new Error('RSS provider unavailable'));
      return Promise.resolve({ items: [] });
    });

    await runMasterPipeline();

    expect(feedSourceStatuses.findOneAndUpdate).toHaveBeenCalledWith(
      { sourceId: FEED_SOURCES[0].id },
      {
        $set: expect.objectContaining({
          status: 'failed',
          lastError: 'RSS provider unavailable'
        })
      },
      expect.objectContaining({ upsert: true })
    );
    expect(parser.parseURL).toHaveBeenCalledWith(FEED_SOURCES[1].url);
    expect(feedSourceStatuses.findOneAndUpdate).toHaveBeenCalledTimes(FEED_SOURCES.length);
  });
});

const { feedSourceStatuses } = require('../repositories');
const { FEED_SOURCES } = require('../config/feedSources.js');
const {
  runMasterPipeline,
  isFeedPipelineRunning
} = require('../workers/feedWorker.js');

exports.getFeedStatus = async (req, res) => {
  try {
    const records = await feedSourceStatuses.find({});
    const statusBySource = new Map(records.map((record) => [record.sourceId, record]));
    const sources = FEED_SOURCES.map((source) => {
      const current = statusBySource.get(source.id);
      return {
        ...source,
        status: current?.status || 'unknown',
        lastStartedAt: current?.lastStartedAt || null,
        lastFinishedAt: current?.lastFinishedAt || null,
        lastSuccessAt: current?.lastSuccessAt || null,
        lastError: current?.lastError || null,
        lastItemCount: current?.lastItemCount ?? null,
        lastNewCount: current?.lastNewCount ?? null,
        durationMs: current?.durationMs ?? null
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        isRunning: isFeedPipelineRunning(),
        sources
      }
    });
  } catch (error) {
    console.error('Failed to load feed source status:', error);
    return res.status(500).json({ success: false, message: 'Failed to load feed source status.' });
  }
};

exports.refreshFeeds = async (req, res) => {
  if (isFeedPipelineRunning()) {
    return res.status(409).json({
      success: false,
      message: 'A feed synchronization is already running.'
    });
  }

  runMasterPipeline().catch((error) => {
    console.error('Manual feed synchronization failed:', error);
  });
  return res.status(202).json({
    success: true,
    message: 'Feed synchronization started.'
  });
};

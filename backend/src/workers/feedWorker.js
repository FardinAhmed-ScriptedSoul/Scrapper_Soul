const Parser = require('rss-parser');
const axios = require('axios');
const { posts, feedSourceStatuses } = require('../repositories');
const { RSS_FEEDS, CRYPTO_SOURCE, OSINT_SOURCE } = require('../config/feedSources.js');

const parser = new Parser();
let activePipeline = null;

const persistSourceStatus = async (source, startedAt, details) => {
  const finishedAt = new Date();
  const status = {
    sourceId: source.id,
    name: source.name,
    provider: source.provider,
    url: source.url,
    category: source.category,
    status: details.error ? 'failed' : 'success',
    lastStartedAt: startedAt,
    lastFinishedAt: finishedAt,
    lastItemCount: details.itemCount,
    lastNewCount: details.newCount,
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    lastError: details.error ? details.error.slice(0, 1000) : null
  };
  if (!details.error) status.lastSuccessAt = finishedAt;

  try {
    await feedSourceStatuses.findOneAndUpdate(
      { sourceId: source.id },
      { $set: status },
      { upsert: true, returnDocument: 'after', runValidators: true }
    );
  } catch (error) {
    console.error(`Failed to record feed status for ${source.id}:`, error.message);
  }
};

const fetchRssFeeds = async () => {
  console.log('🔄 Fetching configured RSS content streams...');
  let newPostsCount = 0;

  for (const feed of RSS_FEEDS) {
    const startedAt = new Date();
    let itemCount = 0;
    let newCount = 0;
    let failure = null;

    try {
      const parsedFeed = await parser.parseURL(feed.url);
      const topItems = (parsedFeed.items || []).slice(0, 10);
      itemCount = topItems.length;

      for (const item of topItems) {
        const guidIdentifier = item.guid || item.id || item.link;
        if (!guidIdentifier || !item.title || !item.link) {
          throw new Error('RSS item is missing a stable identifier, title, or source link.');
        }

        const exists = await posts.exists({ uniqueGuid: guidIdentifier });
        if (exists) continue;

        let imageUrl = '';
        if (item.enclosure?.url) imageUrl = item.enclosure.url;
        else if (item.content) imageUrl = item.content.match(/src="([^"]+)"/)?.[1] || '';

        await posts.create({
          category: feed.category,
          title: item.title,
          contentSummary: item.contentSnippet || item.summary || '',
          sourceName: feed.name,
          sourceUrl: item.link,
          imageUrl,
          uniqueGuid: guidIdentifier,
          publishedAt: item.pubDate ? new Date(item.pubDate) : new Date()
        });
        newCount++;
        newPostsCount++;
      }
    } catch (error) {
      failure = error.message || 'RSS source sync failed.';
      console.error(`Failed to parse updates from feed source [${feed.name}]:`, failure);
    }

    await persistSourceStatus(feed, startedAt, {
      itemCount,
      newCount,
      error: failure
    });
  }

  console.log(`✅ RSS sync complete. Ingested (${newPostsCount}) new timeline posts.`);
};

const fetchCryptoMarketData = async () => {
  console.log('🪙 Fetching CoinGecko market data...');
  const startedAt = new Date();
  let itemCount = 0;
  let newCount = 0;
  let failure = null;

  try {
    const response = await axios.get(CRYPTO_SOURCE.url, {
      params: {
        vs_currency: 'usd',
        order: 'market_cap_desc',
        per_page: 5,
        page: 1,
        sparkline: false
      }
    });

    if (!Array.isArray(response.data)) {
      throw new Error('CoinGecko returned an invalid market-data response.');
    }
    itemCount = response.data.length;

    for (const coin of response.data) {
      const todayString = new Date().toISOString().split('T')[0];
      const uniqueGuid = `crypto-${coin.id}-${todayString}`;
      const exists = await posts.exists({ uniqueGuid });
      if (exists) continue;

      const isPositive = coin.price_change_percentage_24h >= 0;
      const trendIndicator = isPositive ? '📈' : '📉';
      await posts.create({
        category: 'crypto',
        title: `${coin.name} (${coin.symbol.toUpperCase()}) updates at $${coin.current_price.toLocaleString()}`,
        contentSummary: `${coin.name} is tracking ${trendIndicator} by ${coin.price_change_percentage_24h ? coin.price_change_percentage_24h.toFixed(2) : '0.00'}% over the past 24 hours. Market Cap: $${coin.market_cap.toLocaleString()}. Total trading volume: $${coin.total_volume.toLocaleString()}.`,
        sourceName: 'CoinGecko Analytics',
        sourceUrl: `https://www.coingecko.com/en/coins/${coin.id}`,
        imageUrl: coin.image,
        uniqueGuid,
        publishedAt: new Date()
      });
      newCount++;
    }
  } catch (error) {
    failure = error.message || 'CoinGecko synchronization failed.';
    console.error('CoinGecko synchronization failed:', failure);
  }

  await persistSourceStatus(CRYPTO_SOURCE, startedAt, {
    itemCount,
    newCount,
    error: failure
  });
  if (!failure) console.log(`✅ Crypto sync complete. Ingested (${newCount}) financial status cards.`);
};

const fetchOsintAlerts = async () => {
  console.log('🕵️‍♂️ Fetching OSINT timeline updates...');
  const startedAt = new Date();
  let itemCount = 0;
  let newCount = 0;
  let failure = null;

  try {
    const parsedFeed = await parser.parseURL(OSINT_SOURCE.url);
    const updates = (parsedFeed.items || []).slice(0, 10);
    itemCount = updates.length;

    for (const item of updates) {
      const uniqueGuid = item.guid || item.link;
      if (!uniqueGuid || !item.link) {
        throw new Error('OSINT item is missing a stable identifier or source link.');
      }
      const exists = await posts.exists({ uniqueGuid });
      if (exists) continue;

      const cleanContent = item.contentSnippet
        ? item.contentSnippet.replace(/(<([^>]+)>)/gi, '')
        : '';
      await posts.create({
        category: 'osint',
        title: item.title
          ? (item.title.length > 80 ? `${item.title.substring(0, 80)}...` : item.title)
          : 'Threat Intel update captured',
        contentSummary: cleanContent || 'No detailed intelligence text payload parsed.',
        sourceName: 'X / @vxunderground (Nitter RSS Intel)',
        sourceUrl: item.link,
        imageUrl: '',
        uniqueGuid,
        publishedAt: item.pubDate ? new Date(item.pubDate) : new Date()
      });
      newCount++;
    }
  } catch (error) {
    failure = error.message || 'OSINT feed synchronization failed.';
    console.error('OSINT timeline sync failed:', failure);
  }

  await persistSourceStatus(OSINT_SOURCE, startedAt, {
    itemCount,
    newCount,
    error: failure
  });
  if (!failure) console.log(`✅ OSINT sync complete. Ingested (${newCount}) intelligence items.`);
};

const executeMasterPipeline = async () => {
  console.log('\n==================================================');
  console.log('🚀 STARTING PLATFORM CORE AGGREGATION MASTER SYNC');
  console.log('==================================================');

  await fetchRssFeeds();
  await fetchCryptoMarketData();
  await fetchOsintAlerts();

  console.log('==================================================');
  console.log('⏳ MASTER PIPELINE SYNC COMPLETE. SYSTEM ACTIVE.');
  console.log('==================================================\n');
};

const runMasterPipeline = () => {
  if (activePipeline) return activePipeline;
  activePipeline = executeMasterPipeline().finally(() => {
    activePipeline = null;
  });
  return activePipeline;
};

const isFeedPipelineRunning = () => activePipeline !== null;

module.exports = { runMasterPipeline, isFeedPipelineRunning };

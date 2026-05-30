const Parser = require('rss-parser');
const Post = require('../models/post.model.js');
const parser = new Parser();
const axios = require('axios');

// Defined target streams for category feeds
const FEEDS = [
  // --- INTERNATIONAL NEWS ---
  { name: 'BBC World News', url: 'http://feeds.bbci.co.uk/news/world/rss.xml', category: 'international' },
  { name: 'Reuters Top News', url: 'https://news.google.com/rss/search?q=when:24h+site:reuters.com', category: 'international' },
  
  // --- IT / TECH WORLD ---
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', category: 'tech' },
  { name: 'Wired Tech', url: 'https://www.wired.com/feed/category/gear/latest/rss', category: 'tech' },
  
  // --- OSINT / CYBERSECURITY ---
  { name: 'The Hacker News', url: 'https://feeds.feedburner.com/TheHackerNews', category: 'osint' },
  { name: 'BleepingComputer', url: 'https://www.bleepingcomputer.com/feed/', category: 'osint' }
];

const fetchGlobalFeeds = async () => {
  console.log("🔄 Background Engine Triggered: Fetching RSS content streams...");
  let newPostsCount = 0;

  for (const feed of FEEDS) {
    try {
      const parsedFeed = await parser.parseURL(feed.url);
      const topItems = parsedFeed.items.slice(0, 10);

      for (const item of topItems) {
        const guidIdentifier = item.guid || item.id || item.link;
        const exists = await Post.exists({ uniqueGuid: guidIdentifier });
        
        if (!exists) {
          let img = "";
          if (item.enclosure && item.enclosure.url) img = item.enclosure.url;
          else if (item.content && item.content.match(/src="([^"]+)"/)) img = item.content.match(/src="([^"]+)"/)[1];

          await Post.create({
            category: feed.category,
            title: item.title,
            contentSummary: item.contentSnippet || item.summary || "",
            sourceName: feed.name,
            sourceUrl: item.link,
            imageUrl: img,
            uniqueGuid: guidIdentifier,
            publishedAt: item.pubDate ? new Date(item.pubDate) : new Date()
          });
          newPostsCount++;
        }
      }
    } catch (feedError) {
      console.error(`⚠️ Failed to parse updates from feed stream source [${feed.name}]:`, feedError.message);
    }
  }
  console.log(`✅ RSS sync complete. Ingested (${newPostsCount}) new timeline posts.`);
};

const fetchCryptoMarketData = async () => {
  console.log("🪙 Background Engine Triggered: Fetching Crypto Market Trends...");
  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
      params: {
        vs_currency: 'usd',
        order: 'market_cap_desc',
        per_page: 5,
        page: 1,
        sparkline: false
      }
    });

    const markets = response.data;
    let newMarketPosts = 0;

    for (const coin of markets) {
      const todayString = new Date().toISOString().split('T')[0];
      const uniqueGuid = `crypto-${coin.id}-${todayString}`;
      const exists = await Post.exists({ uniqueGuid });

      if (!exists) {
        const isPositive = coin.price_change_percentage_24h >= 0;
        const trendIndicator = isPositive ? '📈' : '📉';
        
        await Post.create({
          category: 'crypto',
          title: `${coin.name} (${coin.symbol.toUpperCase()}) updates at $${coin.current_price.toLocaleString()}`,
          contentSummary: `${coin.name} is tracking ${trendIndicator} by ${coin.price_change_percentage_24h ? coin.price_change_percentage_24h.toFixed(2) : '0.00'}% over the past 24 hours. Market Cap: $${coin.market_cap.toLocaleString()}. Total trading volume: $${coin.total_volume.toLocaleString()}.`,
          sourceName: 'CoinGecko Analytics',
          sourceUrl: `https://www.coingecko.com/en/coins/${coin.id}`,
          imageUrl: coin.image,
          uniqueGuid: uniqueGuid,
          publishedAt: new Date()
        });
        newMarketPosts++;
      }
    }
    console.log(`✅ Crypto sync complete. Ingested (${newMarketPosts}) financial status cards.`);
  } catch (error) {
    console.error("⚠️ Crypto API synchronization failed:", error.message);
  }
};

const fetchTwitterOsintAlerts = async () => {
  console.log("🕵️‍♂️ Background Engine Triggered: Gathering OSINT Timelines...");
  try {
    // Standard public Nitter proxy endpoint targeting vxunderground for reliable malware/ransomware technical alerts
    const NITTER_OSINT_FEED = 'https://nitter.privacydev.net/vxunderground/rss';
    
    const parsedTwitterFeed = await parser.parseURL(NITTER_OSINT_FEED);
    const updates = parsedTwitterFeed.items.slice(0, 10);
    let newOsintAlerts = 0;

    for (const tweet of updates) {
      const uniqueGuid = tweet.guid || tweet.link;
      const exists = await Post.exists({ uniqueGuid });

      if (!exists) {
        // Strip out lingering HTML layouts from proxy text streams safely
        const cleanContent = tweet.contentSnippet ? tweet.contentSnippet.replace(/(<([^>]+)>)/gi, "") : "";

        await Post.create({
          category: 'osint',
          title: tweet.title ? (tweet.title.length > 80 ? tweet.title.substring(0, 80) + '...' : tweet.title) : 'Threat Intel update captured',
          contentSummary: cleanContent || "No detailed intelligence text payload parsed.",
          sourceName: 'X / @vxunderground (Nitter RSS Intel)',
          sourceUrl: tweet.link,
          imageUrl: "",
          uniqueGuid: uniqueGuid,
          publishedAt: tweet.pubDate ? new Date(tweet.pubDate) : new Date()
        });
        newOsintAlerts++;
      }
    }
    console.log(`✅ OSINT live capturing complete. Ingested (${newOsintAlerts}) intelligence items.`);
  } catch (error) {
    console.error("⚠️ OSINT timeline scraper threw exceptions:", error.message);
  }
};

// Master Orchestrator linking every worker stream together
const runMasterPipeline = async () => {
  console.log("\n==================================================");
  console.log("🚀 STARTING PLATFORM CORE AGGREGATION MASTER SYNC");
  console.log("==================================================");
  
  await fetchGlobalFeeds();
  await fetchCryptoMarketData();
  await fetchTwitterOsintAlerts(); // Core OSINT stream runner included
  
  console.log("==================================================");
  console.log("⏳ MASTER PIPELINE SYNC COMPLETE. SYSTEM ACTIVE.");
  console.log("==================================================\n");
};

module.exports = { runMasterPipeline };
const RSS_FEEDS = Object.freeze([
  { id: 'bbc-world', name: 'BBC World News', provider: 'RSS', url: 'http://feeds.bbci.co.uk/news/world/rss.xml', category: 'international' },
  { id: 'reuters-top', name: 'Reuters Top News', provider: 'Google News RSS', url: 'https://news.google.com/rss/search?q=when:24h+site:reuters.com', category: 'international' },
  { id: 'techcrunch', name: 'TechCrunch', provider: 'RSS', url: 'https://techcrunch.com/feed/', category: 'tech' },
  { id: 'wired-tech', name: 'Wired Tech', provider: 'RSS', url: 'https://www.wired.com/feed/category/gear/latest/rss', category: 'tech' },
  { id: 'the-hacker-news', name: 'The Hacker News', provider: 'RSS', url: 'https://feeds.feedburner.com/TheHackerNews', category: 'osint' },
  { id: 'bleeping-computer', name: 'BleepingComputer', provider: 'RSS', url: 'https://www.bleepingcomputer.com/feed/', category: 'osint' }
]);

const CRYPTO_SOURCE = Object.freeze({
  id: 'coingecko-markets',
  name: 'CoinGecko Market Data',
  provider: 'CoinGecko API',
  url: 'https://api.coingecko.com/api/v3/coins/markets',
  category: 'crypto'
});

const OSINT_SOURCE = Object.freeze({
  id: 'vxunderground-nitter',
  name: 'X / @vxunderground',
  provider: 'Nitter RSS',
  url: 'https://nitter.privacydev.net/vxunderground/rss',
  category: 'osint'
});

const FEED_SOURCES = Object.freeze([...RSS_FEEDS, CRYPTO_SOURCE, OSINT_SOURCE]);

module.exports = { RSS_FEEDS, CRYPTO_SOURCE, OSINT_SOURCE, FEED_SOURCES };

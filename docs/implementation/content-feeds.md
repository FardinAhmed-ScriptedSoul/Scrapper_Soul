# Content Feeds Implementation

The feed worker retrieves configured RSS/API content, derives a stable identifier, checks for an existing `uniqueGuid`, and stores new posts through the repository. Feed entries are returned by category through `/api/v1/feed`.

The configured feed-source registry is shared by the worker and the status API. It includes six RSS sources, CoinGecko market data, and the X/@vxunderground Nitter RSS source, each with a category mapping. Every source attempt records status, last attempt/success times, fetched/new counts, duration, and the latest error in `FeedSourceStatus`. A failed provider is recorded as failed and does not stop later sources.

`GET /api/v1/feeds` requires authentication and returns configured sources with their recorded status. `POST /api/v1/feeds/refresh` requires authentication and is limited to one request per IP every 15 minutes. Manual and scheduled periodic refreshes share a single-flight pipeline to avoid overlapping runs in one server process.

Tests mock RSS/API providers and verify source status, failure isolation, authorization, source mapping, and refresh rate limiting. Live feed availability is not part of the automated suite.

# Feed Status and Controls

## Configured sources

The feed-source registry is the source of truth for the worker and status API. It exposes provider name, URL, and category for six RSS sources, CoinGecko market data, and the X/@vxunderground Nitter RSS feed.

## API

- `GET /api/v1/feeds` — authenticated; returns `isRunning` and all configured sources.
- `POST /api/v1/feeds/refresh` — authenticated; starts the shared feed pipeline and returns HTTP 202.

Manual refresh is rate-limited to one request per IP address per 15-minute window. A currently running synchronization returns HTTP 409. Automatic and manual synchronization share a single-flight pipeline within the process.

Each source reports `unknown`, `success`, or `failed`, last attempt and successful-sync timestamps, fetched and newly saved item counts, run duration, and latest error. A failed source is not represented as a successful empty response.

## Persistence and failure behavior

`FeedSourceStatus` stores the latest source attempt. The feed worker catches source-specific provider/persistence errors, records the source as failed, and continues to the remaining providers. Status-write failures are logged explicitly. Feed entries continue to be deduplicated and stored in the shared `Post` collection.

## Verification

`backend/tests/Upstash/integration/feedStatus.routes.test.js` covers authentication, actual source metadata, failed status display, and refresh rate limiting. `backend/tests/Upstash/workers/feedWorker.test.js` covers actual counts and continuation after an individual source fails.

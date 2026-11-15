# Feature Roadmap

## Current working scope

- Account registration, email verification, and login.
- One-off Amazon Books, Indeed Jobs, and Booking.com searches.
- Categorized RSS news and crypto-market feed items.
- A saved-results library with owner-scoped scraper records, shared feed entries, filters, pagination, and selected-record CSV export.
- Opt-in job-completion and terminal-failure email notifications.
- Owner-scoped saved search presets with on-demand queueing and supported schedule creation.
- Per-source feed-sync status and authenticated, rate-limited manual refresh.
- Queue history, removal of queued jobs, retry of failed jobs, and CSV export.
- Recurring Amazon and Indeed searches.
- Overview counts from stored records and the Bull queue.

The proxy manager and unsupported system controls were removed rather than presented as working features. Booking stays remain available as one-off searches; recurring Booking searches need date fields and are not currently supported.

## Delivered

### Saved Results Library

The Results page searches existing Amazon, Indeed, Booking, and news-feed records. Scraper records are scoped by the signed-in user's ID; news posts are shared. Search, source/date filters, sorting, pagination, explicit loading/error/empty states, and selected-record CSV export are implemented. The API does not launch a scraper. Legacy scraper documents without an owner are intentionally omitted.

### Job Notifications

Users can opt in to completion and/or terminal-failure emails. Preferences are stored per user and default to disabled. The queue sends a failure notification only after its configured retries are exhausted; delivery errors are logged without changing job status.

### Saved Search Presets

Users can create, edit, delete, run, and schedule their own Amazon, Indeed, and Booking presets. Engine-specific fields are validated; Booking presets include stay dates and run as one-off jobs only. Amazon/Indeed presets reuse the existing schedule API.

### Feed Status and Controls

The Feed Status page lists the configured RSS, CoinGecko, and Nitter providers and their categories. It displays the latest actual result, item counts, successful-sync time, and source error. Manual refresh is authenticated, limited to one request per IP every 15 minutes, and shares the same single-flight pipeline as automatic sync.

## Delivery rule

Implement one feature at a time: confirm requirements, add API/data tests, implement the backend, then add the UI and validate the complete flow. Use source-authorized APIs or collection methods and respect provider terms and rate limits.

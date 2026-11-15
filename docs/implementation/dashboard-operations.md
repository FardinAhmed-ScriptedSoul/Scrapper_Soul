# Dashboard and Operations Implementation

## Implemented

- The overview reads record counts from MongoDB, queue counts from Bull/Redis, and host memory from the operating system.
- Queue history lists waiting, active, completed, and failed jobs. Users can remove queued jobs and retry failed jobs.
- Amazon and Indeed schedules are stored per user and registered with the cron scheduler.
- Feed posts are listed by category.

## Removed placeholder controls

Proxy management, retention, concurrency, webhooks, and API-key authentication have no backing implementation and are not shown in the UI or exposed as dashboard endpoints. Booking scraping is available for one-off searches, but recurring Booking schedules are unsupported because schedules do not yet collect stay dates.

## Startup

The singleton server initializes the scrape worker and cron scheduler after connecting MongoDB, then starts the feed sync and HTTP listener. Tests exercise startup through injected dependencies and an ephemeral HTTP listener.

# System Design

## Purpose

The application provides a local dashboard for authenticated data-collection requests, cached results, scheduled jobs, and a small set of public content feeds. Its backend coordinates MongoDB, Redis/Bull, Python subprocesses, and email delivery.

## Design goals

- Keep browser, HTTP, persistence, and worker responsibilities separate.
- Make database access replaceable and testable through repositories.
- Run one API listener and one set of background workers per Node process.
- Keep tests isolated from production credentials and third-party services.
- Report only measurements the application actually collects.
- Prefer explicit unavailable states over simulated proxy or telemetry results.

## Non-goals

- Circumventing source access controls or anti-automation protections.
- Providing a proxy rotation or proxy ingestion service.
- Claiming measured throughput, CPU, throttling, or success metrics without data.
- Replacing provider backups or operational monitoring.

## Main runtime flows

### Authenticated API request

1. The React app calls the shared API client.
2. Express routes validate the request and apply authentication/rate/activity middleware.
3. Controllers coordinate application behavior and repositories.
4. Repositories perform MongoDB operations through Mongoose models.
5. The controller returns a JSON response; the frontend hook maps it into view state.

### Scrape request

1. The authenticated route validates query parameters.
2. The controller checks the MongoDB cache through the relevant repository.
3. On a cache miss, it starts the configured Python executable with a fixed script path and request arguments.
4. The controller parses the process output, validates/persists records, and returns the result.
5. Queue-based runs use Bull and the scrape worker; scheduled jobs are placed on that queue by the cron scheduler.

Tests replace process spawning with fixtures. Automated tests do not make real requests to target sites.

### Scheduled job

1. A schedule is stored per user in MongoDB.
2. The scheduler registers active schedule expressions at server startup and syncs them after changes.
3. A cron tick enqueues a Bull job.
4. The worker dispatches to the Python script, persists returned records through repositories, and updates schedule run state.

### Content feed

The background feed worker reads the configured RSS/API sources, deduplicates entries by `uniqueGuid`, and stores posts through the repository. Each configured source records its latest attempt, successful-sync timestamp, fetched/new item counts, duration, and current error state. A source failure does not stop attempts for later sources. The authenticated status endpoint exposes the configured provider/category mapping and manual refresh is rate-limited; automatic and manual runs share a single in-process pipeline.

### Saved results

The authenticated Results API searches the Amazon, Indeed, Booking, and feed collections without starting scraper processes. It applies source, text, and inclusive date filters before sorting and paginating the combined records. Scraper queries are scoped to the authenticated user; news posts are shared feed content. One-off requests and scheduled jobs attach the owner ID when saving scraper records. Legacy scraper records without an owner are omitted because their ownership cannot be established.

### Job notifications

Users must explicitly opt in and choose completion and/or terminal-failure events. Queue event listeners send email through the existing mail adapter after a job completes or exhausts its configured retries. Delivery errors are logged and contained so they cannot change the scrape job's status; intermediate failed attempts do not send email.

### Saved search presets

Presets are stored per user with only the parameters valid for their scraper engine. A queued run copies the validated parameters and owner ID into a Bull job. Amazon and Indeed presets can also be converted into existing schedules; Booking presets include check-in/check-out dates and can run on demand, while recurring Booking remains unsupported.

## Persistence

MongoDB stores users (including notification preferences), blacklisted tokens, user-owned scraper results and presets, schedules, per-source feed sync status, and shared feed posts. Redis supports OTP/session cache operations and the Bull queue. MongoDB is required to start the API; Redis is required for queue-backed work. OTP fallback state is process-local and is not shared across instances.

## Failure handling

- Missing required configuration fails during configuration loading.
- MongoDB startup failures are propagated to the singleton server bootstrap, which performs cleanup and exits with a non-zero status.
- Redis queue failures are surfaced through queue errors; Redis-backed OTP paths have a local fallback.
- Python subprocess failures return an API error and do not create success-shaped scraper data.
- Unsupported dashboard measurements are represented as unavailable.

## Security and operations

- Keep provider credentials in ignored local environment files or a secret manager.
- Docker Compose injects `backend/.env` at runtime; Docker build contexts exclude local environment files and credentials.
- The default Compose port bindings are loopback-only. Do not publish MongoDB or Redis to an untrusted network.
- Restrict MongoDB network access to the application environment.
- Use TLS Redis URLs when required by the provider.
- Use HTTPS in deployed environments and configure the frontend origin explicitly.
- Back up MongoDB independently; a newly created service is empty unless data is restored or reseeded.
- Compose named volumes persist MongoDB and Redis data across container recreation; `docker compose down --volumes` deletes that data.
- Use source-approved APIs or collection methods and respect source terms and rate limits.

## Known gaps

Proxy management, webhook delivery, data-retention enforcement, API-key authentication, and password-reset email delivery are not implemented. The UI does not expose controls for these capabilities.

# Saved Search Presets

## Scope

Users can save reusable Amazon, Indeed, and Booking searches. Presets are private to their owner and can be listed, created, edited, deleted, or queued. Amazon and Indeed presets can also create schedules through the existing schedule API. Booking presets require check-in and check-out dates and are one-off only.

## API

- `GET /api/v1/presets` — list the authenticated user's presets.
- `POST /api/v1/presets` — create a validated preset.
- `PUT /api/v1/presets/:id` — replace a preset owned by the authenticated user.
- `DELETE /api/v1/presets/:id` — delete an owned preset.
- `POST /api/v1/presets/:id/run` — enqueue a Bull job with the saved engine parameters and owner ID.

Indeed presets require a location. Booking presets require valid `YYYY-MM-DD` dates with check-out later than check-in. All presets require a name and a non-empty query. Queueing returns HTTP 202 and the job ID; the existing Tasks page displays the job.

## Queue and schedule behavior

Queued jobs reuse the scrape worker and persist results under the preset owner. Booking job persistence includes the required stay dates and maps the scraper's title/URL output to the Booking model. The UI offers recurring schedules only for Amazon/Indeed, reusing `/api/v1/dashboard/schedules`; it does not create unsupported Booking schedules.

## Verification

`backend/tests/Upstash/integration/preset.routes.test.js` covers authentication, validation, owner-scoped listing and edits, and queue payloads. `backend/tests/Upstash/unit/workers/scrapeWorker.test.js` verifies Booking date and owner persistence.

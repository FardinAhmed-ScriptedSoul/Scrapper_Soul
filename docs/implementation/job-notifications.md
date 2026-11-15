# Job Notifications

## Scope

Authenticated users can opt in to email messages for successful jobs and/or jobs that fail after exhausting Bull's configured retries. Preferences are disabled by default. Email notifications use the existing mail adapter and the email on the user's account.

## Preferences API

- `GET /api/v1/notifications/preferences` returns `{ enabled, events: { completed, failed } }`.
- `PUT /api/v1/notifications/preferences` saves that same object. All three values must be booleans.

Both routes require authentication and read/update only the current user's preference document.

## Delivery behavior

The scrape worker registers Bull `completed` and `failed` listeners. Completion messages are sent only when enabled and selected. Failure messages are sent only after `attemptsMade` reaches the job's configured `attempts` count. Missing users, disabled preferences, and unowned legacy queue jobs do not trigger email.

Mail delivery errors are logged and contained in the event listener so they cannot fail, retry, or otherwise alter the scrape job. Notifications are not sent for intermediate attempts.

## Verification

`backend/tests/Upstash/integration/notification.routes.test.js` covers authentication, default opt-out, persistence, and invalid preferences. `backend/tests/Upstash/unit/services/jobNotification.services.test.js` covers selected events, terminal failure, opt-out, and mail errors using a mocked provider.

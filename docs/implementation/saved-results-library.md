# Saved Results Library

## Scope

The authenticated Results page reads records already stored in MongoDB for Amazon books, Indeed jobs, Booking stays, and the shared news feed. Searching, paging, and exporting do not start scraper processes.

## API

`GET /api/v1/results`

Query parameters:

| Parameter | Default | Description |
| --- | --- | --- |
| `source` | `all` | `all`, `amazon`, `indeed`, `booking`, or `news` |
| `q` | empty | Case-insensitive text match; maximum 100 characters |
| `from` | none | Inclusive start date in `YYYY-MM-DD` |
| `to` | none | Inclusive end date in `YYYY-MM-DD` |
| `sort` | `newest` | `newest` or `oldest` |
| `page` | `1` | One-based page number; the requested offset cannot exceed 10,000 records |
| `limit` | `20` | Page size from 1 to 100 |

Successful responses contain a normalized `data` array and `pagination` metadata (`page`, `limit`, `total`, `totalPages`). Invalid source, date, sort, search, or pagination values return HTTP 400. Database failures return HTTP 500.

## Ownership and persistence

One-off scraper requests stamp `req.user._id` on saved records and use it in cache queries. Scheduled jobs carry the schedule owner's ID through Bull to the worker. Result searches and dashboard saved-record counts filter scraper collections by that owner. News feed posts are shared public feed content and are not assigned to a user.

Historical scraper documents without an owner are not returned by the library because there is no reliable way to attribute them. No migration claims those records for a user.

## Frontend behavior

The Results navigation page supports search, source/date filters, chronological sorting, page navigation, and selection of records on the current page. CSV export serializes only selected records already loaded from the API; it does not call a scrape endpoint. Loading, error, and empty states are shown explicitly.

## Verification

`backend/tests/Upstash/integration/results.routes.test.js` covers authentication, owner isolation, sorting/pagination, filters, and invalid input. Scraper integration tests cover owner-scoped cache hits and owner assignment on new records.

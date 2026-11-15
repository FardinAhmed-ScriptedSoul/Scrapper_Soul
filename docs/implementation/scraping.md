# Scraping Implementation

## Request path

The authenticated API exposes Amazon, Indeed, and Booking query endpoints. Each endpoint validates required query fields, normalizes cache keys, checks MongoDB through a repository, and starts a Python script on a cache miss. Results are parsed and persisted before being returned. Queue-driven jobs use the Bull worker and the same result repositories.

`PYTHON_EXECUTABLE` can point to the local Python interpreter; otherwise the backend resolves the project `venv` path for the current operating system.

## Test boundary

API tests stub child-process spawning and feed fixture results into controllers. They cover validation, cache hits, malformed output, subprocess errors, and persistence failures without contacting external targets.

The Python scripts have no automated test runner configured in this repository. Do not treat successful mocked API tests as proof that a live source permits or returns data.

## Safe use

Use sources and collection methods you are authorized to access. Respect provider terms, published rate limits, privacy requirements, and applicable law. This implementation documentation does not describe bypassing access controls.

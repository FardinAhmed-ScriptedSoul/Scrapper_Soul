# Authentication Implementation

## Implemented

- Registration request validates the required fields, checks for an existing account, and sends a registration OTP.
- OTP verification creates a user and returns an HTTP-only session cookie.
- Login checks the password hash, sends a login OTP, then issues a signed JWT after OTP verification.
- Authentication middleware accepts the session cookie or a Bearer token and checks the user's token version.
- Logout records token invalidation in Redis when available and in the MongoDB blacklist repository.
- Logout-all increments the persisted token version.

## Storage and dependencies

User and blacklist persistence goes through the repository layer. OTPs use Redis with a five-minute TTL when Redis is available; local-memory fallback is process-local. Mail delivery uses the configured OAuth transporter.

## Current limitation

Password reset currently stores a hashed reset token and expiry, but does not send a reset link. The route therefore does not complete a user-accessible reset flow yet.

## Tests

Unit middleware/token tests and HTTP integration tests use an in-memory MongoDB instance with Redis and mail mocked. No production credentials are needed.

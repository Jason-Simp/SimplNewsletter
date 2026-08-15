# Decisions

## 2026-08-15 — SimplNewsletter security audit

- Preserve the public publication bucket, but remove SVG and apply explicit size/MIME constraints; published media URLs are a product requirement.
- Keep application data access server-side and revoke browser table grants rather than trusting historical broad RLS policies.
- Disable the seeded signup code and public self-signup; future registration remains invite/code controlled through the service role.
- Treat a missing per-school webhook secret as a protected human configuration action and keep inbound routes fail-closed.
- Require exact deployed Git revision evidence and two complete production verifier passes before verification.


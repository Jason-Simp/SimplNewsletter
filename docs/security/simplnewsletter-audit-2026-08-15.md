# SimplNewsletter production security audit — 2026-08-15

## Scope and production mapping

- Property: SimplNewsletter / The Wire
- Canonical repository: `Jason-Simp/SimplNewsletter`
- Production service: `https://simplnewsletter.onrender.com`
- Render service: `srv-d6umnn5m5p6s73919djg`
- Supabase project: `ctolirqtwkwzemitnnyj` (The Wire)
- Verified production revision: `cf0eb59c9ba3013ed7e17af130932b19bb31ced9`
- Verified Render deploy: `dep-da0e9qm1egvs739et0pg`
- Runtime hardening PRs: [#1](https://github.com/Jason-Simp/SimplNewsletter/pull/1), [#2](https://github.com/Jason-Simp/SimplNewsletter/pull/2)

## Outcome

The scoped production property passed its complete production security verifier twice on the exact deployed revision: **38/38 checks per run, 76/76 combined, zero failures**. The official Supabase security advisor reports **zero warnings and zero errors**; its two remaining informational notices identify intentionally fail-closed tables with RLS enabled and no browser policies.

This result is evidence for the tested controls, not a claim that the property is unhackable.

## Repaired vulnerabilities and defects

1. Upgraded Next.js, React, Supabase clients, WebSocket, PostCSS, TypeScript, ESLint, and their lockfile. Full and production-only dependency audits now report zero vulnerabilities.
2. Revoked every direct `anon` and `authenticated` grant on application tables and sequences. Server authorization is now the only application-data path; broad historical RLS policies can no longer be used to bypass application roles.
3. Disabled Supabase public self-signup and deactivated the known, unbounded seeded `thewire` signup code without deleting its audit row.
4. Replaced non-atomic signup-code validation/increment with one database transaction callable only by `service_role`. Signup failures now return a generic response and bounded inputs are enforced.
5. Removed provider-configuration disclosure from the public system configuration response.
6. Added a strict production CSP, HSTS, MIME-sniffing protection, frame denial, referrer and permissions policies, no-store HTML/API behavior, removal of the framework banner, body-size enforcement, cross-site mutation rejection, and signup throttling.
7. Blocked newsletter callback SSRF by requiring credential-free public HTTPS destinations, resolving DNS, rejecting private/reserved IPv4 and IPv6, disabling redirects, imposing a timeout, and avoiding full callback URLs in logs.
8. Removed executable SVG from accepted uploads and constrained the Supabase bucket to a 5 MiB maximum and an explicit MIME allowlist. Existing public publication behavior was preserved.
9. Sanitized configurable public links and assistant embeds to HTTPS before rendering.
10. Added an atomic durable generation-job claim with a three-attempt ceiling and 15-minute stale-lease recovery, preventing concurrent web instances from running the same job.
11. Enabled RLS on the durable job table, fixed security-definer function search paths and execution grants, moved the vector extension from `public` to `extensions`, and added missing foreign-key indexes.
12. The first production run found that the initial same-origin check did not account for Render TLS termination. PR #2 repaired the defect by validating trusted forwarded host/protocol data while continuing to reject attacker origins. The regression is included in CI.

## Confirmed protections

- Signed-out requests to member, school, newsletter, and signup-code APIs return 401.
- Public newsletter routes expose only published/archived web-selected issues; an unknown school returns 404.
- Cross-site state-changing requests return 403.
- The retired seeded signup code cannot create an account and provider errors are not exposed.
- Inbound and revision webhooks fail closed when no usable school secret exists and create no job.
- The health route reports the exact Render Git revision and is not cached.
- Public media policy excludes SVG.
- Database evidence: 0 browser table grants, 0 sensitive browser function grants, 0 public tables without RLS, 0 active seeded codes, and the storage allowlist/limit applied.
- Supabase leaked-password protection is enabled; public self-signup, anonymous sign-in, and manual linking remain disabled.
- Repository and history pattern checks found no tracked environment/private-key files and no matches for the high-risk credential patterns tested. No secret values were printed.

## Verification evidence and totals

- Local authorization/security regression tests: **9/9 passed**.
- Lint: **passed with zero warnings**.
- Next.js production build: **passed**.
- `npm audit`: **0 vulnerabilities** (full dependency graph).
- `npm audit --omit=dev`: **0 vulnerabilities** (production graph).
- GitHub Security CI for PR #1: **passed**, job `95076969391`.
- GitHub Security CI for PR #2: **passed**, job `95077370925`.
- Production verifier, run 1 on `cf0eb59…`: **38/38 passed**.
- Production verifier, run 2 on `cf0eb59…`: **38/38 passed**.
- Exact production total: **76/76, zero failures**.
- Supabase security advisor: **0 warning, 0 error, 2 informational**.
- Applied database migrations: `newsletter_generation_jobs`, `production_security_hardening`, and `rls_policy_and_index_cleanup`.

## Informational findings and accepted risks

- `newsletter-assets` remains a public bucket because published newsletters require stable public media URLs. Upload, mutation, type, and size controls remain server-side. A later design can separate private drafting assets from published assets if pre-publication confidentiality becomes a requirement.
- Configurable assistant iframes intentionally allow public HTTPS providers. CSP prevents arbitrary non-HTTPS frames, and the configured URL is sanitized; an allowlist should be introduced when the approved provider roster becomes fixed.
- Request throttling is instance-local. It is adequate for the current single Starter instance but must move to a shared durable store before horizontal scaling.
- The two Supabase informational notices are for `signup_codes` and `newsletter_generation_jobs`: both have RLS enabled, no browser grants, and no browser policies by design. Only the trusted service role accesses them.
- Newly created signup-code uses are consumed before Auth account creation, so an upstream Auth failure can spend one use. This fail-closed tradeoff prevents concurrent over-redemption; administrators can issue a replacement code through the protected UI.

## Protected human action

An authorized school/company administrator must generate and save a strong per-school inbound webhook secret before inbound newsletter automation is enabled. The current school has no usable secret, and both webhook routes correctly remain fail-closed. After configuration, run one signed positive webhook and callback flow with a controlled public HTTPS receiver; do not place the secret in source, notes, screenshots, or tickets.

## Independent penetration-test needs

- Authenticated cross-school object-ownership testing with dedicated company-admin, school-admin, and editor test accounts.
- Positive provider-path testing for ElevenLabs, outbound callbacks, email delivery, and configured assistant embeds using non-production test recipients.
- A controlled concurrency/load exercise for signup redemption, generation-job stale recovery, and webhook retries.
- External assessment of CSP compatibility and business-logic abuse once all production provider integrations are configured.

## Current official guidance used

- [Supabase production checklist](https://supabase.com/docs/guides/deployment/going-into-prod)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
- [Supabase Storage buckets and upload restrictions](https://supabase.com/docs/guides/storage/buckets/fundamentals)
- [Supabase password security](https://supabase.com/docs/guides/auth/password-security)
- [Next.js Content Security Policy](https://nextjs.org/docs/app/guides/content-security-policy)
- [Next.js `proxy`](https://nextjs.org/docs/app/api-reference/file-conventions/proxy)


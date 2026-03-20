# Acceptance Criteria

## Content creation
- A user can create a newsletter using a guided builder without editing raw HTML.
- The builder supports all required section types.
- Sections can be enabled, disabled, and reordered.
- Drafts autosave reliably.

## Branding
- Platform UI uses SchoolAmplified branding by default.
- Newsletter outputs can use school/district branding.
- Brand tokens are configurable and not hardcoded throughout the UI.

## Rendering
- The same newsletter content can be rendered as:
  - hosted web page
  - email HTML
  - PDF
  - raw HTML export
- Outputs are channel-appropriate rather than naive copies of one another.

## Distribution
- A user can publish a hosted version.
- A user can export PDF.
- A user can export raw HTML.
- A user can send a test email.
- A user can send to an audience list.

## Media
- A user can upload images and logos.
- Images support alt text.
- Assets can be reused across issues.

## Roles
- Permissions prevent unauthorized publish/send actions.
- Contributor cannot publish/send unless granted approval rights.

## AI
- AI suggestions are clearly reviewable before publish.
- AI does not silently overwrite user-approved content.
- AI-generated content is not published automatically without review.

## Reliability
- Heavy jobs such as PDF generation and email sends run off the request cycle.
- Errors are surfaced clearly in the UI.

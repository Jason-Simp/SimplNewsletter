# AGENTS.md

## Mission

Build The Wire by SchoolAmplified, a multi-tenant school newsletter platform.

This product should let school districts, schools, principals, communications teams, and educators create polished newsletters by filling out a structured form, adding links, uploading images, and optionally reusing prior content. The system should then generate finished newsletters for multiple channels and support distribution from one place.

This is not a blank-canvas design editor. It is a structured publishing system.

## Product positioning

The product should feel like a premium SchoolAmplified add-on and a fast operational tool for school communications teams.

The product advantage is:
- structured input instead of blank-canvas design
- district-safe templates
- one source of truth for many output channels
- consistency across schools
- fast newsletter creation
- built-in distribution workflows

Do not build a clone of consumer drag-and-drop design tools. Build a guided publishing engine.

## Core requirements

### The system must allow users to:
- create newsletters through a guided multi-step form
- paste links and summarize or transform them into newsletter copy
- upload photos and logos
- choose and reorder sections
- preview newsletters in multiple output modes
- distribute and export newsletters in several formats

### The system must support these outputs:
- hosted web version
- email-ready HTML
- raw HTML export
- PDF export
- blog/website-ready version

### The system must support these distribution methods:
- send to an email list
- publish as a hosted webpage
- publish/post as a blog or website article
- export as PDF
- export as raw HTML

## Brand requirements

### Platform brand
Use The Wire by SchoolAmplified as the application-level brand.

Use the SchoolAmplified logo in:
- app header
- dashboard
- builder shell
- preview shell
- settings and admin areas
- optional "Powered by SchoolAmplified" placement in exports if enabled by settings

Use this source asset as the initial platform logo:
- `/Users/jasonsirotin/SimplNewsletter/logo/logo.png`

Do not let school branding replace SchoolAmplified branding in the product UI. However, newsletter outputs should primarily reflect the school or district brand.

### SchoolAmplified default palette
Use these default platform tokens:

- primary: `#123A69`
- secondary: `#86201A`
- primaryDark: `#0F2745`
- background: `#F7F9FC`
- surface: `#FFFFFF`
- text: `#142033`
- mutedText: `#5B667A`
- border: `rgba(18, 58, 105, 0.10)`

### Brand behavior
- Blue is the primary action and navigation color.
- Red is the accent color for highlights and secondary emphasis.
- White and soft neutral backgrounds should dominate content surfaces.
- Navy/dark blue should be used for major text contrast and headers.

### School/district branding
Support per-organization newsletter branding:
- school/district name
- logo
- primary color
- secondary color
- accent color
- footer/contact details
- website URL
- social links
- preferred theme/template

School branding should control newsletter outputs. SchoolAmplified branding should control the surrounding app.

## Design direction

Two references define the build:
1. the sample newsletter files in `/Users/jasonsirotin/SimplNewsletter/sample_newsletter/` are the visual/editorial reference
2. the provided HTML from the product brief is the section inventory and content model reference

Use the sample newsletter as the aesthetic north star for premium editorial hierarchy and polish.

Use the supplied HTML section structure as the basis for the newsletter schema and reusable blocks.

Do not build one giant HTML file intended to perfectly serve web, email, and PDF simultaneously. Use structured content plus separate renderers.

## Required section types

Support at minimum:
- hero
- stats_band
- principal_message
- top_story
- news_grid
- academics
- athletics
- student_spotlight
- arts_events
- clubs_and_organizations
- calendar_snapshot
- cta_band
- quote_or_mission
- quick_links
- footer

Each section must support:
- enabled/disabled
- sort order
- content payload
- optional assets
- layout variant
- channel visibility rules
- validation rules

## Canonical architecture

### Source of truth
Store newsletter content as structured JSON, not raw HTML.

### Renderers
Build separate renderers for:
- hosted web
- email HTML
- PDF
- raw HTML export
- blog/website version

Each renderer must consume the same structured newsletter content model.

## Builder UX

The builder must be step-based.

### Required steps
1. Issue setup
2. Story content
3. Events and links
4. Media
5. Review and preview
6. Distribution

### Required UX features
- autosave drafts
- drag-to-reorder sections
- section enable/disable
- duplicate previous issue
- media upload
- crop/focal point controls
- preview by channel
- clear review step before publish/send

## AI behavior

AI should help transform and polish content but must not invent school facts.

### Allowed AI tasks
- summarize pasted links
- rewrite rough notes into polished newsletter copy
- suggest headlines
- shorten text to fit a section
- generate alt text
- recommend sections to include
- suggest subject lines and preview text
- suggest reuse of prior content

### AI constraints
- never fabricate dates, names, event details, or quotes
- keep source links attached when transforming link-based content
- require human review before publish
- visually distinguish suggestions from approved content in the builder

## Infrastructure

### Hosting
Use Render for:
- web app
- API/backend
- workers/background jobs
- staging and production environments

### Backend/data/storage
Use Supabase for:
- auth
- PostgreSQL
- media storage
- row-level security if needed
- optional vector search for retrieval assistance

### Recommended stack
- Next.js
- React
- TypeScript
- Tailwind CSS
- modular rendering system
- background jobs for expensive tasks

### Background jobs
Use worker/background processing for:
- PDF generation
- bulk email sending
- image processing
- metadata extraction from links
- scheduled publishing or sends

Do not block the main request/response cycle on heavy jobs.

## Vector store usage

Supabase vector search is optional and should enhance drafting, not power core rendering.

### Valid use cases
- retrieve similar prior newsletters
- suggest recurring announcements
- surface archived principal messages
- reuse assets/snippets
- recommend related existing content

### Invalid use cases
- rendering logic
- permissions
- distribution state
- deterministic validation
- template selection logic

The system must function correctly without vector search.

## Security and compliance

Must support:
- role-based access
- approval-aware publishing
- accessible outputs
- alt text support
- contrast-safe themes
- footer identity consistency
- unsubscribe/preferences support for email if external sending is enabled
- audit trail for publishes/sends
- link validation before publish

## Roles

### district_admin
- manage all schools
- manage templates/themes
- manage organization settings
- manage distribution settings
- view analytics and archive

### school_admin
- create/edit/publish newsletters for their school
- manage school branding
- manage school audience lists

### contributor
- create/edit drafts
- cannot send/publish unless granted approval rights

### approver
- review drafts
- approve and publish/send

## Build order

Build in this order:

1. content schemas
2. Supabase data model
3. organization branding
4. SchoolAmplified theme system
5. media storage
6. draft persistence
7. multi-step builder UI
8. section toggles and ordering
9. web renderer
10. raw HTML renderer
11. email renderer
12. PDF renderer
13. hosted publish flow
14. test email flow
15. send-to-list flow
16. PDF export flow
17. archive/history
18. AI-assisted summarization and rewriting
19. vector-assisted prior content suggestions
20. analytics and workflow polish

Do not start with overbuilt integrations before the core content model and renderers exist.

## Engineering standards

- use TypeScript throughout
- prefer server-safe and deterministic rendering
- keep renderer logic modular
- keep content model versioned
- write tests for schema validation and rendering transformations
- keep templates configuration-driven, not hardcoded
- separate domain logic from UI logic
- avoid coupling email, web, and PDF rendering paths

## Definition of done

A build is successful when:
- a school staff user can create a polished newsletter in minutes through a guided workflow
- one structured content model produces web, email, PDF, and HTML outputs
- the outputs respect school branding
- the app respects SchoolAmplified branding
- distribution is available from one interface
- the product is easier than manually making separate newsletter versions

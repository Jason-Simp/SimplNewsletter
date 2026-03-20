# Architecture

## Stack
- Next.js
- React
- TypeScript
- Tailwind CSS
- Supabase
- Render

## Core principle
Newsletter content is stored as structured JSON and rendered through separate output pipelines.

## Major modules

### 1. Organization and branding
Stores SchoolAmplified platform tokens plus school/district branding profiles.

### 2. Newsletter schema engine
Defines section types, validation rules, defaults, and channel visibility.

### 3. Builder UI
Guided multi-step creation flow with autosave, reorder, and preview.

### 4. Asset/media system
Uploads, transformations, focal point, alt text, and reuse.

### 5. Rendering layer
Separate renderers:
- web
- email
- PDF
- HTML export
- blog/website

### 6. Distribution layer
Handles:
- test sends
- send to audience list
- hosted publish
- PDF generation
- HTML export
- archive entries

### 7. AI transformation layer
Optional assistance:
- link summarization
- rewrite
- headline suggestions
- prior-content retrieval suggestions

## Data entities
- Organization
- User
- Newsletter
- NewsletterSection
- Asset
- Template
- DistributionJob
- AudienceList

## Rendering rules

### Web
- responsive
- SEO-aware
- school-branded
- accessible
- shareable

### Email
- simplified layout
- email-safe CSS
- stable image references
- subject/preview support

### PDF
- paginated
- editorial
- print-safe image quality

### HTML export
- clean standalone output
- easy for CMS or web posting

## Background jobs
Use workers for:
- PDF generation
- bulk email sends
- image processing
- link metadata extraction
- scheduled sends/publishes

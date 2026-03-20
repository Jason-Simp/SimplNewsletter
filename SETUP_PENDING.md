# Setup Pending

These inputs are still needed before the app can become fully operational:

- Supabase project URL and keys
- Render service configuration and environment variables
- Email provider credentials
- Final vector store connection details

The current scaffold already assumes:

- standalone app
- school-managed users
- selectable per-issue distribution channels
- optional instant publish or approval routing
- asset retention for 30 days
- image/audio/video/document size limits and compression strategy

When credentials arrive, the next implementation pass should connect:

- database persistence
- authentication
- storage buckets
- worker-driven media compression and cleanup
- hosted publication jobs
- PDF generation
- email sending
- vector-store sync jobs

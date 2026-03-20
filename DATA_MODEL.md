# Data Model

## Organization
- id
- district_id nullable
- type: district | school
- name
- logo_url
- primary_color
- secondary_color
- accent_color
- website_url
- contact_email
- phone
- address
- social_links jsonb
- template_defaults jsonb

## User
- id
- organization_id
- name
- email
- role: district_admin | school_admin | contributor | approver

## Newsletter
- id
- organization_id
- title
- slug
- issue_date
- status: draft | review | published | sent | archived
- theme_id nullable
- created_by
- updated_by
- published_at nullable

## NewsletterSection
- id
- newsletter_id
- type
- sort_order
- enabled
- layout_variant nullable
- channel_visibility jsonb
- content_json jsonb
- asset_refs jsonb

## Asset
- id
- organization_id
- type: image | logo | document
- file_url
- alt_text
- metadata jsonb

## Template
- id
- name
- type: web | email | pdf | hybrid
- schema_version
- config_json jsonb

## DistributionJob
- id
- newsletter_id
- channel: email | web | pdf | html_export | blog
- status: queued | running | completed | failed
- payload_json jsonb
- result_json jsonb
- completed_at nullable

## AudienceList
- id
- organization_id
- name
- source_type: manual | csv | integration
- contact_count

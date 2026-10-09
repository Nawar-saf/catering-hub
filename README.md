# Gulf Catering Hub

Corporate catering operating platform for company catering requests, ready packages and recurring employee meal programs.

## Production architecture

- Static web app on `gulfcateringhub.com`
- Supabase Auth + Postgres + RLS
- `public-request` Edge Function for rate-limited public submissions
- Public requests stored in `catering_requests`
- Company orders stored in `company_orders`
- Provider packages require admin review before publication
- Public provider data is projected into `public_provider_profiles`; the base provider table is not anonymously readable.

## Main product flows

### Public requests
1. Ready package request
2. Custom catering request
3. Employee meal program request

Public forms call the `public-request` Edge Function. The browser does not insert directly into the legacy `requests` table.

### Company portal
- Explicit company onboarding
- Branch management
- Monthly budget
- Approval modes: `none`, `threshold`, `always`
- Company orders
- Recurring employee meal plans

### Provider portal
- Provider onboarding
- Package drafts
- Admin package review
- Publish/pause approved packages
- Assigned order accept/reject/complete flow

### Operations
- Structured public request queue
- Company orders
- Provider review
- Package review
- Recurring programs
- Pagination for operational lists

## Database

Historical base schema: `supabase-v5-schema.sql`.

Current production state includes the V6 migrations documented in `DATABASE_V6.md`. The follow-up advisor cleanup is checked in as `supabase-v6-advisor-cleanup.sql`. The canonical full hardening SQL is retained in Supabase migration history under `gch_production_hardening_v6`.

## Edge Function

Source: `supabase/functions/public-request/index.ts`

The deployed function validates public requests, applies an IP-based request limit, validates package availability and writes to `catering_requests`.

## Security notes

- Browser code uses a Supabase publishable key. This key is intentionally public and relies on RLS.
- Never place a Supabase secret/service-role key in frontend code.
- Operations supports TOTP enrollment from the admin UI.
- Enable Supabase leaked-password protection in Auth settings.
- Configure custom SMTP before wider production onboarding so confirmation/recovery email is branded and reliable.
- CAPTCHA can be layered on top of the public Edge Function later if abuse requires it; server-side rate limiting is already enforced.

## Product next step

The next major product layer is the RFQ / Quotes Engine:
`Request → provider matching → quotes → comparison → selection → order → invoice/payment status → completion → rating`.

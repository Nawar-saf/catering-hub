# DATABASE V26 — Provider Acquisition Pipeline

This release prepares Gulf Catering Hub for real provider acquisition before buyer marketing.

## Provider leads

Added `public.provider_leads` for the supply-side acquisition funnel.

Tracked fields include:

- company name
- contact name when known
- phone / email
- city
- website / Instagram URL
- source
- internal notes
- pipeline status
- interest / contact / invitation timestamps
- optional link to an activated provider account

Pipeline states:

`new → contacted → invited → interested → application_started → submitted → verified → activated`

`not_interested` is available as an exit state.

Only operations admins can read or modify provider leads. Public visitors cannot query the table directly.

## Public interest capture

`provider-interest` is a public Edge Function used by `/partner.html`.

It provides a low-friction path for a catering company that is interested but not ready to create a full provider account immediately.

Controls include:

- allowed-origin checks
- server-side validation
- honeypot field
- IP-based rate limiting
- duplicate matching by normalized email or phone
- safe URL normalization
- escaped internal notification email content

The full provider application remains separate and still requires legal verification and document approval.

## Operations acquisition console

`/inbox/growth.html` now acts as the provider acquisition CRM:

- lead metrics
- pipeline filtering/search
- manual lead entry
- source tracking
- internal notes
- copyable WhatsApp outreach copy
- admin-confirmed provider invitation email
- links to partner onboarding and provider verification

Provider email invitations remain explicit admin actions; no bulk automated outreach is performed.

## Initial supply seed

The production pipeline was seeded with 13 publicly researched Muscat/Oman catering providers. No provider was contacted and no invitation was sent during seeding.

## Security

The provider-interest rate-limit RPC is executable only by the `service_role` used inside the Edge Function. Security advisor is clean for this work; the remaining project-wide warning is Supabase Auth leaked-password protection being disabled.

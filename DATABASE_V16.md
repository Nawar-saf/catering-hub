# Gulf Catering Hub — Database V16 (Public Provider Marketplace Profiles)

Applied to the production Supabase project on 2026-10-09.

## Goal

Give approved catering providers a safe public marketplace presence without exposing private provider-account data.

## Public profile data

`public.public_provider_profiles` now carries only marketplace-safe aggregate fields for approved providers:

- provider id and display name;
- service areas;
- cuisine types;
- maximum capacity;
- minimum lead time;
- average rating;
- review count;
- completed-order count;
- performance score;
- profile update timestamp.

Phone numbers, owner user ids, billing data, private quotes, invoices and other operational records are not exposed through this table.

## Sync model

`private.sync_public_provider_profile()` now mirrors the marketplace-safe aggregate values from `catering_providers` whenever an approved provider is inserted or updated.

If a provider is suspended or otherwise stops being approved, its public profile row is removed. Provider deletion also removes the public profile.

Approved providers existing at migration time are backfilled automatically.

## Public marketplace surfaces

The application can safely use this table for:

- `/providers.html` — searchable approved-provider directory;
- `/provider.html?id=<provider_uuid>` — shareable provider profile;
- public package discovery, where package RLS already requires an approved active package and a matching public provider profile.

## Security

Anonymous access remains read-only. Provider users cannot write directly to `public_provider_profiles`; marketplace visibility is controlled by the server-side sync trigger and provider approval state.

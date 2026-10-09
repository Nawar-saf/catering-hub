# Database V22 — Public Provider Brand & Commercial Profile

## Scope

V22 upgrades an approved provider from a plain supplier record into a marketplace storefront with public brand assets and standardized commercial expectations.

### Public brand media

`catering_providers` and `public_provider_profiles` include:

- `logo_path`
- `cover_path`

Public images are stored in the `provider-media` bucket. Upload/update/delete access is restricted to the approved provider's own user folder, while retrieval is intentionally public because these are marketplace brand assets.

The private legal-document bucket remains separate and private.

### Commercial terms

Provider records and public profiles include:

- `minimum_order_value`
- `change_cutoff_hours`
- `cancellation_policy`
- `delivery_setup_notes`
- `dietary_capabilities[]`
- `service_languages[]`

These values are informational marketplace terms. The selected provider quote remains the transaction-specific commercial reference.

### Public profile sync

`private.sync_public_provider_profile()` mirrors only marketplace-safe fields into `public_provider_profiles`. Public reads are still gated by active legal verification through RLS.

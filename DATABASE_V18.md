# DATABASE V18 — Verified Partner Onboarding

## Goal

A provider account is only an application until Gulf Catering Hub verifies the underlying business. Providers cannot become marketplace-active merely by creating an Auth account or completing a public profile.

## New provider controls

- `catering_providers.accepting_marketplace_requests`
- `provider_verifications`
- `provider_documents`
- private Storage bucket: `provider-documents`

## Verification data

The verification record stores legal name, CR and trade-license details, authorized representative, optional VAT / Power of Attorney information, business contacts and address, bank account information, declarations, workflow status and reviewer metadata.

Verification states:

`draft → submitted → under_review → verified`

Alternative review outcomes:

`needs_changes` or `rejected`

Provider-side edits are locked while a submission is under review or verified. An admin may request changes, reject or verify the application.

## Required documents

Base requirements:

1. Commercial Registration
2. Trade / activity license
3. Authorized representative ID
4. Bank certificate
5. Signed / stamped email declaration
6. Logo
7. Cover photo

Conditional:

- VAT certificate when VAT registered
- Power of Attorney when the applicant acts by authorization

Optional:

- Trademark certificate

Provider documents are private. Storage RLS restricts uploads to the authenticated user's folder. Provider and operations-admin access is policy-controlled; files are not exposed on public provider profiles.

## Approval gate

Database trigger `private.enforce_provider_approval_verification()` prevents `catering_providers.status` from becoming `approved` unless the verification record is already `verified`.

When a provider becomes approved, marketplace availability is enabled. Non-approved providers are unavailable to marketplace matching.

## Marketplace eligibility

Open RFQ eligibility, matching and opportunity notifications require all of:

- provider status = approved
- `accepting_marketplace_requests = true`
- matching service area
- enough capacity
- enough lead time
- active RFQ / deadline rules

Approved providers may pause new marketplace opportunities without deleting or suspending their account.

## Public trust boundary

Sensitive verification and banking data remain in protected tables. The public marketplace profile remains a separate sanitized projection containing only marketplace-safe information such as name, service areas, cuisines, capacity, lead time, ratings, completed orders and current marketplace availability.

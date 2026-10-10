# DATABASE V24 — Provider Compliance Hardening

Provider marketplace eligibility now depends on **active legal verification and approved required documents**, not only on `verification_status='verified'`.

## What changed

`private.provider_verification_active(provider_id)` now requires all of the following:

- verification status is `verified`
- Commercial Registration expiry is still valid when an expiry exists
- trade/activity license expiry is still valid when an expiry exists
- every currently required provider document is still `approved`

Required documents remain dynamic:

- Commercial Registration
- trade/activity license
- authorized representative ID
- bank certificate
- signed/stamped email/authorization declaration
- logo
- cover image
- VAT certificate when VAT is enabled
- Power of Attorney when applicable

## Document replacement behavior

A provider may replace an already-approved document after verification, for example during renewal. The replacement goes back to `pending` and marketplace compliance becomes inactive until operations reviews and approves the new document.

Provider document writes are now blocked while the verification application itself is `submitted` or `under_review`, preventing the evidence set from changing during an active compliance review.

## Approval gate

Changing a provider to `status='approved'` now requires `private.provider_verification_active(provider_id)=true`.

This prevents a provider from being activated when a required document is pending/rejected or when a tracked legal expiry is no longer valid.

## Marketplace effect

Inactive compliance automatically blocks:

- public provider visibility through the existing public-profile RLS rule
- Open Marketplace RFQ eligibility
- direct-RFQ availability checks
- provider availability eligibility

The provider portal also disables commercial publishing / marketplace availability controls while compliance is inactive.

## QA

Rollback-only production tests were run after deployment:

1. verified provider + all required approved documents => compliance active
2. one required approved document changed to pending => compliance inactive
3. provider activation attempted while a required document is pending => blocked by the database approval gate

No test data was persisted.

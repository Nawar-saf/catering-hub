# Gulf Catering Hub

Corporate catering marketplace and procurement platform for custom RFQs, verified providers, recurring employee meals, approvals, purchase orders, invoices, payments, fulfillment tracking, provider performance and support.

## Production architecture

- Static web app on `gulfcateringhub.com`
- Supabase Auth + Postgres + RLS + private Storage
- Supabase Edge Functions for public submissions, company-team invitations and provider outreach
- Brevo for branded invitation emails
- Browser clients use a Supabase publishable key; authorization is enforced in Postgres

## Core marketplace model

`Company publishes requirement → verified eligible providers discover it → providers submit competing quotes → company compares verified providers and offers → company selects → executable order → tracked fulfillment → invoice / payment / review`

Companies may also use private invite-only sourcing.

## Public experience

- `/marketplace.html` is customer-first: companies publish RFQs and compare verified providers.
- `/providers.html` lists approved marketplace providers.
- `/provider.html?id=<provider_uuid>` is a sanitized public provider profile.
- `/partner.html` explains the provider application and verification process.
- Provider login / onboarding is deliberately secondary and linked from partner/footer surfaces rather than presented as a primary customer navigation action.

## Commercial model

Open Marketplace deals currently use a **5% provider success fee**. Registration, opportunity browsing and quote submission are free. Fee rows are created server-side when an open-marketplace quote becomes an order and become due after completion. Invite-only sourcing currently does not create a Marketplace success fee.

## Company portal

- Company signup, email confirmation and onboarding
- Branches, monthly budget and approval policies
- Company roles: Requester, Approver, Finance, Admin
- Team invitations
- Open Marketplace or Invite-only RFQs
- RFQ location prefill from branch data
- Multiple quote comparison with verified-provider trust information
- Accepted quote → executable order
- Recurring employee meal plans
- Purchase orders, invoice approval and payment records
- Spend / savings / provider reporting
- Fulfillment tracking from confirmation through delivery
- Issue reporting and execution history
- Company reviews
- In-app activity and notifications
- Shared support center

## Verified provider onboarding

Provider signup is an **application**, not automatic marketplace access.

Required workflow:

`Auth account → operating profile → legal / business / banking data → private document upload → operations review → verified → marketplace approved`

Verification supports:

- legal / trade name
- Commercial Registration + expiry
- trade/activity license + expiry
- authorized representative
- VAT when applicable
- Power of Attorney when applicable
- business address and contacts
- bank name, account name and IBAN
- declarations and terms acceptance

Required document workflow includes CR, license, authorized representative ID, bank certificate, signed/stamped declaration, logo and cover photo, plus VAT / POA documents when applicable.

Sensitive partner documents are stored in a private `provider-documents` Storage bucket with RLS. Legal and banking data are not copied to public marketplace profiles.

A database trigger prevents `catering_providers.status='approved'` until legal verification is `verified`.

See `DATABASE_V18.md`.

## Provider portal

After approval, partners can:

- maintain operating profile and service areas
- pause / resume receiving new marketplace opportunities
- create package drafts and send them for review
- publish approved packages
- discover eligible RFQs
- filter opportunities by source/type/quote state
- submit and revise commercial quotes
- see the current Marketplace success-fee disclosure
- manage assigned orders
- update fulfillment stages: confirmed, preparing, ready, out for delivery, arrived, delivered
- acknowledge POs and submit invoices
- review payments and Marketplace fees
- monitor performance / SLA and company reviews
- use the shared support center

Marketplace eligibility uses approval, explicit availability, RFQ state/deadline, service geography, capacity and lead time.

## Fulfillment tracking

`scheduled → confirmed → preparing → ready → out_for_delivery → arrived → delivered`

All changes are written to `order_fulfillment_events`. A protected RPC validates provider transitions. Companies can report execution issues but cannot impersonate provider progress.

Company tracking: `/company/orders.html`

Provider execution: `/provider/orders.html`

See `DATABASE_V19.md`.

## Support / disputes

`/support.html` is role-aware for companies, providers and operations admins.

- categories for order execution, RFQ, finance, account, provider verification and disputes
- optional order/RFQ linkage
- priority and status workflow
- message thread
- operations-only internal messages supported by the data model
- tenant-scoped RLS

See `DATABASE_V19.md`.

## RFQ / Quotes Engine

Primary Marketplace flow:

`Company RFQ → eligibility (verified approval + availability + deadline + geography + capacity + lead time) → opportunity discovery / alert → quote → comparison → selected quote → order → success-fee ledger`

Private sourcing:

`Company RFQ → selected provider invites → quote → comparison → selected quote → order`

Providers cannot read competing provider quotes. Quote acceptance is atomic and produces a traceable linked order.

## Public provider trust boundary

Only approved providers are mirrored into `public_provider_profiles`. The public projection contains marketplace-safe data such as display name, service areas, cuisines, capacity, lead time, aggregate rating, completed orders, performance score and marketplace availability.

Legal documents, banking details, owner account details and private operational records never belong in the public profile table.

## Procurement

`Order / accepted quote → PO → provider invoice → company approval → payment records → paid / partially paid`

Payment records are balance-checked. Company role permissions are enforced in Postgres.

## Operations portal

- public request queue
- company orders
- RFQ liquidity / no-quote rescue
- provider legal verification and document review
- provider activation / suspension
- package review
- recurring programs
- PO / invoice / payment oversight
- marketplace GMV / success-fee management
- provider performance leaderboard
- meal-delivery exceptions
- support queue
- operating activity timeline
- growth / provider invitation tooling
- TOTP enrollment

## Security

- RLS on exposed business tables
- private provider document bucket
- provider approval enforced by database verification gate
- provider quote isolation
- public provider data separated from private account/legal records
- marketplace fee creation server-side
- fulfillment transitions enforced by protected RPC
- company finance/team actions role-gated in Postgres
- support records tenant-scoped
- printable records use authenticated sessions and normal RLS
- no service-role key in frontend code

Supabase Auth leaked-password protection is still recommended before broader production onboarding.

## Database evolution

- `DATABASE_V6.md` — production hardening
- `DATABASE_V7.md` — RFQ / Quotes Engine
- `DATABASE_V8.md` — company roles + procurement + finance
- `DATABASE_V9.md` — performance + reviews + recurring meal operations
- `DATABASE_V10.md` — activity + notifications + printable records
- `DATABASE_V11.md` — open marketplace RFQs
- `DATABASE_V12.md` — marketplace success-fee ledger
- `DATABASE_V13.md` — opportunity notifications
- `DATABASE_V14.md` — lead-time eligibility + indexes
- `DATABASE_V15.md` — service-area filtering
- `DATABASE_V16.md` — safe public provider profiles
- `DATABASE_V17.md` — branch-aware marketplace geography
- `DATABASE_V18.md` — verified provider legal onboarding + private documents
- `DATABASE_V19.md` — fulfillment tracking + support center

## Current go-to-market priority

The launch-critical product path is now substantially built. The main bottleneck is marketplace liquidity: onboard real verified providers first, then acquire corporate buyers and monitor quote depth, time-to-first-quote, selection conversion, successful fulfillment, GMV and fee collection.

## Next product layers after live usage

- automated collection of Marketplace fees through a payment gateway
- email / push delivery for urgent opportunities and execution changes
- provider blackout dates / richer availability calendar
- direct RFQ clarification threads between buyer and provider
- deeper spend / SLA / savings exports
- promotions / sponsored placement only after organic marketplace liquidity exists
- knowledge / training center for providers based on real support patterns

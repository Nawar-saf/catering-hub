# Gulf Catering Hub

Corporate catering marketplace and procurement platform for custom RFQs, verified providers, recurring employee meals, approvals, purchase orders, invoices, payments, fulfillment tracking, provider performance and support.

## Production architecture

- Static web app on `gulfcateringhub.com`
- Supabase Auth + Postgres + RLS + private/public Storage
- Supabase Edge Functions for public submissions, company-team invitations and provider outreach
- Brevo for branded invitation emails
- Browser clients use a Supabase publishable key; authorization is enforced in Postgres

## Core marketplace model

`Company publishes requirement → verified eligible providers discover it → providers submit competing quotes → company compares verified providers and offers → company selects → executable order → tracked fulfillment → invoice / payment / review`

Companies may also select one provider and send a **direct private RFQ** without operations manually routing it.

## Public experience

- `/marketplace.html` is customer-first: companies publish RFQs and compare verified providers.
- `/providers.html` lists approved marketplace providers with availability, branding and trust signals.
- `/provider.html?id=<provider_uuid>` is a sanitized provider storefront with brand media, commercial terms, packages and a direct-RFQ action.
- `/partner.html` explains provider application and verification.
- Provider login / onboarding is deliberately secondary and linked from partner/footer surfaces rather than presented as a primary customer navigation action.

## Commercial model

Open Marketplace deals currently use a **5% provider success fee**. Registration, opportunity browsing and quote submission are free. Fee rows are created server-side when an open-marketplace quote becomes an order and become due after completion. Invite-only sourcing currently does not create a Marketplace success fee.

## Company portal

- Company signup, email confirmation and onboarding
- Branches, monthly budget and approval policies
- Company roles: Requester, Approver, Finance, Admin
- Team invitations
- Open Marketplace or Invite-only RFQs
- Direct RFQ to a selected verified provider
- RFQ location prefill from branch data
- Multiple quote comparison with verified-provider trust information
- Accepted quote → executable order
- Supplier directory with preferred-provider selection
- Repeat an earlier order either with the same provider or by reopening it to the Marketplace
- Customer change/cancellation requests that require provider response before applying
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
- set `available`, `busy` or `paused` marketplace state
- add blackout windows for dates when capacity is unavailable
- pause / resume receiving new marketplace opportunities
- manage a public logo and cover image
- publish commercial expectations: minimum order, change cutoff, cancellation policy, setup notes, dietary capabilities and languages
- create package drafts and send them for review
- publish approved packages
- discover eligible RFQs
- receive direct private RFQ invitations from companies
- filter opportunities by source/type/quote state
- submit and revise commercial quotes
- see the current Marketplace success-fee disclosure
- manage assigned orders
- approve or reject customer order-change/cancellation requests
- update fulfillment stages: confirmed, preparing, ready, out for delivery, arrived, delivered
- acknowledge POs and submit invoices
- review payments and Marketplace fees
- monitor performance / SLA and company reviews
- use the shared support center

Marketplace eligibility uses verified approval, explicit availability, blackout dates, RFQ state/deadline, service geography, capacity and lead time.

## Provider availability

The canonical operational check is `private.provider_available_for_event(provider_id, event_date)`.

It combines:

- approved status
- active legal verification
- availability state
- base lead time
- temporary busy lead-time buffer
- blackout dates

The same availability logic is reused by open-marketplace discovery, provider notifications, admin matching and direct RFQs.

See `DATABASE_V21.md`.

## Fulfillment tracking

`scheduled → confirmed → preparing → ready → out_for_delivery → arrived → delivered`

All changes are written to `order_fulfillment_events`. A protected RPC validates provider transitions. Companies can report execution issues but cannot impersonate provider progress.

Company tracking: `/company/orders.html`

Provider execution: `/provider/orders.html`

See `DATABASE_V19.md`.

## Order changes and repeat business

Accepted orders can receive a structured customer change/cancellation request instead of moving coordination to WhatsApp.

`Company request → provider review → accept/reject → controlled order update → company notification`

Only one pending request is allowed per order. Provider acceptance applies supported date/headcount/notes changes or an accepted cancellation through a protected workflow.

Completed/accepted orders can also be repeated. Repeating creates a **new RFQ** with a new date/deadline instead of reusing historical price or availability.

See `DATABASE_V23.md`.

## Provider storefront / public trust

Approved providers can maintain public brand assets and standardized commercial information. Public profiles can expose:

- logo and cover image
- display name and verified state
- service areas / cuisines
- capacity / lead time / availability
- aggregate rating and completed orders
- minimum order value
- general change cutoff
- cancellation / setup notes
- dietary capabilities and service languages
- active packages

Legal documents, bank data, IDs and private operational records remain private.

See `DATABASE_V22.md`.

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

Direct/private sourcing:

`Company selects provider → atomic private RFQ + invite → provider quote → accepted quote → order`

Providers cannot read competing provider quotes. Quote acceptance is atomic and produces a traceable linked order.

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
- private provider legal-document bucket
- public provider media isolated in a separate owner-write bucket
- provider approval enforced by database verification gate
- expired verification excluded from public provider reads and opportunity eligibility
- provider quote isolation
- public provider data separated from private account/legal records
- marketplace fee creation server-side
- fulfillment transitions enforced by protected RPC
- order-change application restricted to a private workflow marker
- direct-RFQ public RPC is SECURITY INVOKER; privileged transaction logic stays private
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
- `DATABASE_V21.md` — provider availability, blackout dates and atomic direct RFQs
- `DATABASE_V22.md` — provider public branding and commercial terms
- `DATABASE_V23.md` — order change requests and repeat ordering

## Current go-to-market priority

The launch-critical product path is substantially built. The main bottleneck is marketplace liquidity: onboard real verified providers first, then acquire corporate buyers and monitor quote depth, time-to-first-quote, selection conversion, successful fulfillment, repeat-order rate, GMV and fee collection.

## Next product layers after live usage

- automated collection of Marketplace fees through a payment gateway
- email / push delivery for urgent opportunities and execution changes
- structured geospatial service zones after enough provider density exists
- direct RFQ clarification threads between buyer and provider
- deeper spend / SLA / savings exports
- promotions / sponsored placement only after organic marketplace liquidity exists
- knowledge / training center for providers based on real support patterns

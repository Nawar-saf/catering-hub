# Gulf Catering Hub

Corporate catering marketplace and procurement platform for ready packages, custom RFQs, recurring employee meals, approvals, purchase orders, invoices, payments, provider performance and operating audit trails.

## Production architecture

- Static web app on `gulfcateringhub.com`
- Supabase Auth + Postgres + RLS
- Supabase Edge Functions for public submissions and company-team invitations
- Brevo for branded company-team invitation emails
- Browser clients use a Supabase publishable key; authorization is enforced in Postgres

## Core marketplace model

Gulf Catering Hub is a two-sided marketplace:

`Company publishes catering requirement → approved eligible providers discover it → providers submit competing quotes → company compares offers → company selects provider → executable order is created`

Companies can also use private invite-only sourcing when needed.

The marketplace does not require operations staff to manually route every request. Provider approval and platform moderation remain in place.

Public marketplace acquisition is available at `/marketplace.html`. Approved suppliers are discoverable through `/providers.html`, with shareable marketplace profiles at `/provider.html?id=<provider_uuid>`. Marketplace CTAs preserve intent through login/signup: an onboarded company is routed directly to the RFQ composer, while an already-approved provider is routed directly to Marketplace Opportunities.

## Commercial model

Open-marketplace deals use an initial **5% provider success fee**. Registration, opportunity browsing and quote submission are free. The fee is tracked automatically when a marketplace quote becomes an order, becomes due when the order is completed, and can be waived when the order is cancelled/rejected before completion.

Invite-only sourcing currently does not create a marketplace success fee.

The fee is disclosed on the public marketplace page, in the terms, and in the provider quote workflow. Operations Finance includes platform GMV, outstanding success fees, collected fees and admin controls for moving fees through `accrued → invoiced → paid` or waiving them when appropriate.

## Main product flows

### Public acquisition
- Marketplace landing page for companies and providers
- Searchable approved-provider directory
- Shareable public provider profiles
- Public ready packages from approved providers
- Company CTAs route toward publishing an RFQ
- Provider CTAs route toward provider onboarding / Marketplace Opportunities

### Public requests
1. Ready package request
2. Custom catering request
3. Employee meal program request

Public forms call the `public-request` Edge Function. The browser does not write directly to the legacy request table.

### Company portal
- Explicit company onboarding and branch management
- Monthly budget and flexible approval modes: `none`, `threshold`, `always`
- Company roles: Requester, Approver, Finance, Admin
- Email-based team invitations with automatic account linking
- Direct company orders
- RFQ creation with two sourcing modes: Open Marketplace or Invite Only
- Marketplace acquisition intent is preserved across account signup / email confirmation / company onboarding
- Marketplace intent opens the RFQ composer directly after onboarding
- RFQ location is prefilled from the selected company branch where available
- Multiple provider quotes and offer comparison
- Accepted quote → linked executable order
- Recurring employee meal plans with dated delivery occurrences
- Purchase orders (PO)
- Invoice approval/rejection
- Offline payment recording and outstanding-balance tracking
- Spend by provider/branch, RFQ savings estimate and completed-order review queue
- In-app notifications and tenant-scoped operating timeline
- Printable PO and invoice operational records

### Provider portal
- Self-service provider signup and onboarding
- Provider verification before marketplace access
- Approved providers receive a public shareable marketplace profile
- Package drafts and admin review
- Publish/pause approved packages
- Marketplace Opportunities board for eligible open RFQs
- Opportunity search and filters by source, request type and quote state
- Marketplace eligibility checks approval, RFQ state, deadline, capacity, minimum lead time and geography
- Geography considers both RFQ location text and linked company-branch city
- Automatic in-app opportunity alerts for eligible marketplace RFQs
- Private RFQ invitations
- Direct commercial quote submission without waiting for manual routing on marketplace RFQs
- 5% marketplace fee disclosure before quote submission
- Assigned order accept/reject/complete flow
- Purchase-order acknowledgement
- Invoice submission and payment-status tracking
- Marketplace success-fee ledger in the finance portal
- Performance Score / SLA dashboard
- Company reviews and recurring-meal delivery operations
- In-app notifications and provider operating timeline
- Printable PO and invoice operational records

### Operations portal
- Structured public request queue
- Company orders
- Optional RFQ matching and provider invitations for invite-only sourcing or marketplace rescue
- Marketplace Liquidity dashboard: open market demand, no-quote queue, quote depth and time-to-first-quote
- Provider and package review
- Recurring programs
- PO / invoice / payment oversight
- Marketplace GMV and success-fee revenue management
- Provider leaderboard and meal-delivery exceptions
- Operations-wide activity timeline and notification visibility
- Pagination for operational lists
- TOTP enrollment for admin accounts

## RFQ / Quotes Engine

Primary marketplace flow:

`Company RFQ → eligibility (approval + status/deadline + capacity + lead time + geography) → provider opportunity notification/discovery → provider quotes → comparison → accepted quote → company_order → marketplace success-fee ledger`

Private sourcing flow:

`Company RFQ → provider matching/invites → provider quote → comparison → accepted quote → company_order`

Marketplace discovery, automatic notifications and admin matching reuse aligned eligibility rules. Providers cannot read competing providers' quotes. Quote acceptance is atomic and creates a traceable linked order.

See `DATABASE_V7.md`, `DATABASE_V11.md`, `DATABASE_V12.md`, `DATABASE_V13.md`, `DATABASE_V14.md`, `DATABASE_V15.md` and `DATABASE_V17.md`.

## Public provider marketplace profiles

Approved providers are mirrored into a deliberately limited public table. Public profiles contain marketplace-safe information only: display name, service areas, cuisines, capacity, lead time and aggregate performance values.

Suspending a provider removes the public profile automatically. Private provider account, phone, quote, billing and owner-user data are not exposed through the public profile table.

See `DATABASE_V16.md`.

## Procurement and company roles

`Order / accepted quote → PO → provider invoice → company approval → payment records → paid / partially paid`

Company payment terms determine invoice due dates. Payment inserts are balance-checked so recorded payments cannot exceed invoice amount.

See `DATABASE_V8.md`.

## Provider performance and meal operations

`Completed order → company review → provider score → stronger RFQ ranking`

`Recurring plan → dated occurrence → provider delivery → company confirmation / exception`

See `DATABASE_V9.md`.

## Activity and notifications

Important operating events are written to a tenant-scoped audit timeline and can generate in-app company/provider notifications.

`Business event → activity event → targeted notification → user marks read`

New Open Marketplace RFQs automatically create targeted provider opportunity notifications only for providers that satisfy the active marketplace eligibility rules.

PO and invoice records can be opened through the secured `document.html` renderer and printed / saved as PDF using the browser.

See `DATABASE_V10.md`, `DATABASE_V13.md`, `DATABASE_V14.md`, `DATABASE_V15.md` and `DATABASE_V17.md`.

## Edge Functions

- `supabase/functions/public-request/index.ts` — validates/rate-limits anonymous public requests and writes structured records.
- `supabase/functions/company-invite/index.ts` — authenticated company-team invitations and branded Brevo email delivery.

## Security notes

- Public provider data is separated from the base provider table.
- Procurement/review/meal-operation/activity tables use RLS and minimum Data API grants.
- Providers only read their own quotes, POs, invoices, payments, reviews, notifications, delivery operations and marketplace fee records.
- Approved providers can read only marketplace RFQs currently eligible for them, or RFQs they were explicitly invited to.
- Companies only read their own RFQs and submitted quotes on those RFQs.
- Marketplace fee creation is server-side; providers cannot create/delete their own fee rows.
- Public provider profiles are read-only to anonymous visitors and populated by a server-side sync trigger from approved providers only.
- Company finance/team actions are role-gated in Postgres, not only in the UI.
- Printable documents use the current authenticated Supabase session and normal RLS.
- Never place a Supabase secret/service-role key in frontend code.
- Enable Supabase leaked-password protection in Auth settings before broader production onboarding.
- Custom Auth SMTP is still recommended so account confirmation/recovery mail is fully branded; company-team invitations already use Brevo directly.

## Database evolution

- `DATABASE_V6.md` — production hardening
- `DATABASE_V7.md` — RFQ / Quotes Engine
- `DATABASE_V8.md` — company roles + procurement + finance tracking
- `DATABASE_V9.md` — provider performance + ratings + recurring-meal operations
- `DATABASE_V10.md` — activity timeline + in-app notifications + secured printable records
- `DATABASE_V11.md` — open marketplace RFQs + self-service provider quoting
- `DATABASE_V12.md` — marketplace success-fee ledger
- `DATABASE_V13.md` — automatic marketplace opportunity notifications
- `DATABASE_V14.md` — marketplace lead-time eligibility + fee relationship index hardening
- `DATABASE_V15.md` — marketplace provider service-area filtering
- `DATABASE_V16.md` — safe public provider marketplace profiles
- `DATABASE_V17.md` — branch-aware marketplace geography and aligned matching

## Current go-to-market priority

The core marketplace transaction path is built. The next bottleneck is real marketplace liquidity: onboard legitimate catering providers and real corporate buyers, then measure quote depth, time-to-first-quote, RFQ-to-selection conversion, GMV and fee collection using the existing operations dashboards.

## Next product layers

- Payment-gateway collection for marketplace success fees
- Email/push delivery for high-value opportunity alerts in addition to current in-app alerts
- Provider compliance/legal-document workflow
- Cuisine, live availability and more structured geographic matching
- Deeper spend, SLA and savings analytics with exports
- Recurring-meal pause/exception calendars and delivery evidence attachments
- Real provider onboarding and real company acquisition; avoid adding fake production supply data

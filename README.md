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

`Company publishes catering requirement → approved providers discover it → providers submit competing quotes → company compares offers → company selects provider → executable order is created`

Companies can also use private invite-only sourcing when needed.

The marketplace does not require operations staff to manually route every request. Provider approval and platform moderation remain in place.

Public acquisition for the marketplace is available at `/marketplace.html` with separate company and provider entry paths.

## Commercial model

Open-marketplace deals use an initial **5% provider success fee**. The fee is tracked automatically when a marketplace quote becomes an order, becomes due when the order is completed, and is waived if the order is cancelled/rejected before completion.

Invite-only sourcing currently does not create a marketplace success fee.

Operations Finance now includes platform GMV, outstanding success fees, collected fees and admin controls for moving fees through `accrued → invoiced → paid` or waiving them when appropriate.

## Main product flows

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
- Package drafts and admin review
- Publish/pause approved packages
- Marketplace Opportunities board for eligible open RFQs
- Automatic in-app opportunity alerts when new eligible marketplace RFQs are published
- Private RFQ invitations
- Direct commercial quote submission without waiting for manual routing on marketplace RFQs
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

`Company RFQ → eligible approved providers → provider opportunity notification → provider quotes → comparison → accepted quote → company_order → marketplace success-fee ledger`

Private sourcing flow:

`Company RFQ → provider matching/invites → provider quote → comparison → accepted quote → company_order`

Marketplace eligibility currently checks provider approval, RFQ state/deadline, event timing and provider capacity. Providers cannot read competing providers' quotes. Quote acceptance is atomic and creates a traceable linked order.

See `DATABASE_V7.md`, `DATABASE_V11.md`, `DATABASE_V12.md` and `DATABASE_V13.md`.

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

New Open Marketplace RFQs automatically create targeted provider opportunity notifications for eligible approved providers.

PO and invoice records can be opened through the secured `document.html` renderer and printed / saved as PDF using the browser.

See `DATABASE_V10.md` and `DATABASE_V13.md`.

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

## Next product layers

- Payment-gateway collection for marketplace fees
- Email/push delivery for high-value opportunity alerts in addition to current in-app alerts
- Provider compliance/legal-document workflow
- Stronger marketplace matching by service area, cuisine and provider availability
- Deeper spend, SLA and savings analytics with exports
- Recurring-meal pause/exception calendars and delivery evidence attachments
- Real provider onboarding and real company acquisition; avoid adding fake production supply data

# Gulf Catering Hub

Corporate catering procurement and operations platform for ready packages, custom RFQs, recurring employee meals, approvals, purchase orders, invoices, payments, provider performance and operating audit trails.

## Production architecture

- Static web app on `gulfcateringhub.com`
- Supabase Auth + Postgres + RLS
- Supabase Edge Functions for public submissions and company-team invitations
- Brevo for branded company-team invitation emails
- Browser clients use a Supabase publishable key; authorization is enforced in Postgres

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
- RFQ creation, multiple provider quotes and offer comparison
- Accepted quote → linked executable order
- Recurring employee meal plans with dated delivery occurrences
- Purchase orders (PO)
- Invoice approval/rejection
- Offline payment recording and outstanding-balance tracking
- Spend by provider/branch, RFQ savings estimate and completed-order review queue
- In-app notifications and tenant-scoped operating timeline
- Printable PO and invoice operational records

### Provider portal
- Provider onboarding and verification
- Package drafts and admin review
- Publish/pause approved packages
- Assigned order accept/reject/complete flow
- Invited RFQs and commercial quote submission
- Purchase-order acknowledgement
- Invoice submission and payment-status tracking
- Performance Score / SLA dashboard
- Company reviews and recurring-meal delivery operations
- In-app notifications and provider operating timeline
- Printable PO and invoice operational records

### Operations portal
- Structured public request queue
- Company orders
- RFQ matching and provider invitations
- Provider and package review
- Recurring programs
- PO / invoice / payment oversight
- Provider leaderboard and meal-delivery exceptions
- Operations-wide activity timeline and notification visibility
- Pagination for operational lists
- TOTP enrollment for admin accounts

## RFQ / Quotes Engine

`Company RFQ → provider matching → provider invitations → submitted quotes → comparison → accepted quote → company order`

Matching considers service area, provider capacity, lead time, preferred-provider weighting and provider performance. Providers cannot read competing providers' quotes. Quote acceptance is atomic and creates a traceable linked order.

See `DATABASE_V7.md`.

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

PO and invoice records can be opened through the secured `document.html` renderer and printed / saved as PDF using the browser.

See `DATABASE_V10.md`.

## Edge Functions

- `supabase/functions/public-request/index.ts` — validates/rate-limits anonymous public requests and writes structured records.
- `supabase/functions/company-invite/index.ts` — authenticated company-team invitations and branded Brevo email delivery.

## Security notes

- Public provider data is separated from the base provider table.
- Procurement/review/meal-operation/activity tables use RLS and minimum Data API grants.
- Providers only read their own invitations, quotes, POs, invoices, payments, reviews, notifications and delivery operations.
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

## Next product layers

- Deeper spend, SLA and savings analytics with exports
- Recurring-meal pause/exception calendars and delivery evidence attachments
- Email/push delivery for selected in-app notification events
- Provider compliance/legal-document workflow
- Real provider onboarding and real company acquisition; avoid adding fake production supply data

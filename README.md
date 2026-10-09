# Gulf Catering Hub

Corporate catering procurement and operations platform for ready packages, custom RFQs, recurring employee meals, approvals, purchase orders, invoices and payment tracking.

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
- Explicit company onboarding
- Branch management
- Monthly budget and flexible approval modes: `none`, `threshold`, `always`
- Company roles: Requester, Approver, Finance, Admin
- Email-based team invitations with automatic account linking
- Direct company orders
- RFQ creation and quote comparison
- Accepted quote → linked executable order
- Recurring employee meal plans
- Purchase orders (PO)
- Invoice approval/rejection
- Offline payment recording and outstanding-balance tracking

### Provider portal
- Provider onboarding and verification
- Package drafts and admin review
- Publish/pause approved packages
- Assigned order accept/reject/complete flow
- Invited RFQs and commercial quote submission
- Purchase-order acknowledgement
- Invoice submission and payment-status tracking

### Operations portal
- Structured public request queue
- Company orders
- RFQ matching and provider invitations
- Provider and package review
- Recurring programs
- PO / invoice / payment oversight
- Pagination for operational lists
- TOTP enrollment for admin accounts

## RFQ / Quotes Engine

`Company RFQ → provider matching → provider invitations → submitted quotes → comparison → accepted quote → company order`

The matching engine considers service area, provider capacity, lead time and preferred-provider weighting. Providers cannot read competing providers' quotes. Quote acceptance is atomic and creates a traceable linked order.

See `DATABASE_V7.md`.

## Procurement and company roles

V8 adds delegated company roles and a procurement layer:

`Order / accepted quote → PO → provider invoice → company approval → payment records → paid / partially paid`

Company payment terms determine invoice due dates. Payment inserts are balance-checked so recorded payments cannot exceed the invoice amount.

See `DATABASE_V8.md`.

## Database

Historical base schema: `supabase-v5-schema.sql`.

Production hardening and product evolution are retained in Supabase migration history and summarized in:

- `DATABASE_V6.md` — production hardening
- `DATABASE_V7.md` — RFQ / Quotes Engine
- `DATABASE_V8.md` — team roles + procurement + finance tracking

## Edge Functions

- `supabase/functions/public-request/index.ts` — validates/rate-limits anonymous public requests and writes structured records.
- `supabase/functions/company-invite/index.ts` — authenticated company-team invitations and branded Brevo email delivery.

## Security notes

- Public provider data is exposed only through the limited public provider projection; the base provider table is not anonymously readable.
- New procurement tables use RLS and minimum Data API grants.
- Providers only read their own invitations, quotes, POs, invoices and related payments.
- Company finance actions are role-gated in Postgres, not only in the UI.
- Never place a Supabase secret/service-role key in frontend code.
- Enable Supabase leaked-password protection in Auth settings before broader production onboarding.
- Custom Auth SMTP is still recommended so account confirmation/recovery mail is fully branded; team invitations already use Brevo directly.

## Next product layers

- Provider SLA / performance scores and post-completion ratings
- Recurring meal delivery occurrences and exception handling
- Spend / savings / provider-performance reporting
- Notifications and audit timeline
- Printable/exportable PO and invoice documents

# Gulf Catering Hub — Database V8 (Company Team + Procurement)

Applied to the production Supabase project on 2026-10-09.

## Migration history

- `20261009120257_company_team_and_procurement_v8`
- `20261009121000_invoice_po_integrity_v8`
- `20261009121620_procurement_v8_advisor_and_integrity_cleanup`
- `20261009121712_procurement_v8_minimum_api_grants`
- `20261009122035_company_role_boundaries_v8`

## Company team model

`company_members` supports invitation lifecycle and delegated roles:

- `requester` — creates and follows requests.
- `approver` — approves within an optional financial approval limit.
- `finance` — manages invoice approvals and payment records.
- `admin` — manages the team, company settings and branches.

Invitations are keyed by company + normalized email. The `company-invite` Edge Function creates/refreshes the invitation and sends a branded Brevo email from `support@gulfcateringhub.com`.

When the invited user registers or signs in with the same email, `claim_company_invitation()` links the Auth user to the invitation. A user with an existing active company membership is not auto-joined to a second company.

## Procurement workflow

`Company order / accepted quote → Purchase Order → Provider invoice → Company finance approval → Payment records`

### `purchase_orders`

- One PO per company order.
- Provider, total and currency are derived from the linked order by a database trigger.
- PO number can be supplied by the company or generated automatically.
- Company procurement roles can issue/cancel.
- Assigned provider can acknowledge receipt.

### `invoices`

- Provider submits an invoice only for its accepted/completed order.
- Optional PO must belong to the same order/company/provider.
- Invoice due date is calculated from the company's `payment_terms_days`.
- Company Finance/Admin/owner can approve or reject.
- Payment state is controlled by payment-record triggers rather than the browser.

### `payment_records`

- Company Finance/Admin/owner can record offline payments.
- Platform admin can record operational payments through the admin portal.
- The database rejects payments that would exceed invoice balance, including admin-entered payments.
- Invoice status moves automatically to `partially_paid` or `paid`.

## Authorization

Authorization is enforced in Postgres using RLS and guarded triggers.

- Company settings/branches/team management: owner or delegated company `admin`.
- PO issuance: owner, `approver`, `finance`, or company `admin`.
- Invoice approval/payment: owner, `finance`, or company `admin`.
- Providers only access procurement rows linked to their provider account.
- Admin operations remain available to platform admins.

## Data API grants

V8 explicitly removes default broad grants from the new procurement objects.

Authenticated access is limited to:

- `company_members`: SELECT / INSERT / UPDATE / DELETE, with RLS.
- `purchase_orders`: SELECT / INSERT / UPDATE, with RLS.
- `invoices`: SELECT / INSERT / UPDATE, with RLS.
- `payment_records`: SELECT / INSERT, with RLS.

`anon` has no table access to these objects. Broad default privileges such as `TRUNCATE`, `TRIGGER` and `REFERENCES` were explicitly removed.

All four tables have RLS enabled.

## Production verification

After V8:

- Supabase Security Advisor reports no new database/RLS issues; the only remaining warning is the account-level `Leaked Password Protection Disabled` Auth setting.
- All V8 missing-FK-index findings were resolved.
- Performance Advisor can still report `unused_index` for new indexes until production traffic exercises them; these are intentionally retained.
- `company-invite` is deployed ACTIVE with JWT verification enabled and its source is tracked under `supabase/functions/company-invite/index.ts`.

## UI surfaces

- `/company/team.html` — team invitations and roles.
- `/company/finance.html` — PO, invoice approvals, payment tracking and company payment terms.
- `/provider/finance.html` — PO acknowledgement, invoice submission and payment tracking.
- `/inbox/finance.html` — platform-level procurement/finance operations.

# Gulf Catering Hub — Database V13 (Marketplace Opportunity Notifications)

Applied to the production Supabase project on 2026-10-09.

## Goal

Improve marketplace liquidity without requiring operations staff to manually route every open RFQ.

When a company publishes an Open Marketplace RFQ, eligible approved providers now receive an in-app opportunity notification automatically.

## New server-side workflow

`Marketplace RFQ created → eligible approved providers → targeted provider notifications → provider opens Marketplace Opportunities → quote submission`

## Eligibility used for notifications

A provider is notified only when:

- provider status is `approved`;
- RFQ sourcing mode is `marketplace`;
- RFQ is currently open;
- quote deadline has not passed;
- event date has not passed;
- provider capacity can handle the requested headcount, unless capacity is configured as unlimited/unspecified.

The trigger fires when an RFQ is first created as marketplace sourcing, or is changed into marketplace sourcing. Normal RFQ status changes do not spam providers with duplicate opportunity alerts.

## New database objects

- `private.notify_marketplace_rfq_providers()`
- `notify_marketplace_rfq_providers_trg` on `public.rfqs`

Notifications use the existing secure `private.emit_notification(...)` pipeline and link providers directly to `/provider/rfq.html`.

## Operations changes shipped with V13

No additional database tables were needed for these UI layers:

- marketplace revenue dashboard in Operations Finance;
- admin management for accrued / invoiced / paid / waived success fees;
- Marketplace Liquidity dashboard with open-demand count, no-quote queue, quote depth and time-to-first-quote;
- public `/marketplace.html` acquisition page for companies and providers.

## Security

No public write access was added.

Provider opportunity visibility remains controlled by existing RFQ RLS and marketplace eligibility rules. Notification rows are targeted to provider IDs and continue to use the existing notification RLS model.

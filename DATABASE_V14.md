# Gulf Catering Hub — Database V14 (Marketplace Eligibility + Index Hardening)

Applied to the production Supabase project on 2026-10-09.

## Goal

Reduce low-quality marketplace opportunities and avoid notifying providers about jobs they cannot realistically fulfil.

## Marketplace eligibility upgrade

`private.is_marketplace_rfq_available(rfq_id)` now requires all of the following:

- provider status is `approved`;
- RFQ sourcing mode is `marketplace`;
- RFQ is `open` or `quotes_received`;
- quote deadline is still open;
- event date is still in the future;
- provider capacity is sufficient for the requested headcount;
- provider minimum lead time can still be satisfied before the event.

The same lead-time rule is used by the marketplace opportunity notification trigger, so providers are not alerted about impossible turnaround times.

## Performance hardening

Added:

- `marketplace_fees_quote_idx` on `public.marketplace_fees(quote_id)`

This covers the `marketplace_fees_quote_id_fkey` relationship flagged by the Supabase performance advisor.

## Resulting marketplace flow

`Company publishes RFQ → eligibility checks capacity + lead time → eligible providers discover/are notified → provider submits quote → company selects → order → 5% fee ledger`

No client-side permission was widened by this migration. Marketplace quote access remains protected by the existing RLS policies and server-side quote guard.

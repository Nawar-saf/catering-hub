# Gulf Catering Hub — Database V7 (RFQ + Quotes)

Applied to the production Supabase project on 2026-10-09.

## Migration history

- `20261009111547_rfq_quotes_core_v7`
- `20261009111721_rfq_quotes_workflow_v7`
- `20261009112134_rfq_advisor_indexes_v7`
- `20261009114457_rfq_terminal_state_hardening_v7`

## New workflow

`Company RFQ → provider matching/invites → provider quote → company comparison → accepted quote → company_order`

## New tables

- `rfqs`: company request-for-quote header, requirements, deadline and selection state.
- `rfq_provider_invites`: provider invitations with match score and response state.
- `provider_quotes`: commercial quotes, fees, VAT, discount, menu, inclusions, validity and revision.

`company_orders` now includes `rfq_id`, `quote_id`, and `currency` for complete traceability.

## Security model

- All V7 tables have RLS enabled.
- Companies can only read/update their own RFQs and read submitted quotes for them.
- Providers can only read RFQs they were invited to and can only write their own quotes.
- Providers cannot read competing providers' quotes.
- Admin can route RFQs and invite providers.
- Privileged workflow logic lives in the non-exposed `private` schema.
- Public RPC wrappers are `SECURITY INVOKER`.

## Workflow helpers

- `public.match_rfq_providers(rfq_id, limit)` — admin-only matching engine.
- `public.accept_rfq_quote(quote_id)` — atomically accepts a submitted quote and creates the linked executable order.

## Matching score

The initial matching engine considers:

- preferred provider bonus;
- service-area match;
- provider capacity;
- provider lead time vs. event time.

The function invites up to 10 eligible approved providers and defaults to 5.

## State hardening

- A submitted quote cannot be returned to draft; further submitted edits increment its revision.
- Cancelling or closing an RFQ expires any remaining active provider invitations and non-selected quotes.
- Accepted quote selection remains atomic with linked order creation.

## Production checks

Supabase Security Advisor after V7 reports no new database/RLS findings. The account-level `Leaked Password Protection Disabled` warning remains and is unrelated to V7 schema.

Performance Advisor foreign-key findings created by V7 were resolved by `rfq_advisor_indexes_v7`. Newly created indexes can appear as `unused_index` until real traffic exercises them.

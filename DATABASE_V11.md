# Gulf Catering Hub — Database V11 (Open Marketplace RFQs)

Applied to the production Supabase project on 2026-10-09.

## Goal

Turn the RFQ engine from an operations-routed workflow into a true two-sided marketplace while preserving private invite-only sourcing when a company wants it.

## New sourcing model

Every RFQ now has a `sourcing_mode`:

- `marketplace` — approved providers can discover eligible open RFQs and submit quotes directly.
- `invite_only` — only explicitly invited providers can see and quote the RFQ.

Existing RFQs were preserved as `invite_only`. New RFQs default to `marketplace`.

## Provider marketplace access

Approved providers can see marketplace RFQs when:

- the RFQ is open or has received quotes;
- the quote deadline has not passed;
- the event has not passed;
- the provider has enough declared capacity for the headcount.

The provider still cannot read other providers' quotes.

## Security changes

- `rfqs_select` now allows an approved provider to read an eligible marketplace RFQ.
- `provider_quotes_insert` now allows a provider to quote either an invited RFQ or an eligible marketplace RFQ.
- `private.guard_provider_quote_write()` enforces the same rule server-side and still verifies provider approval, RFQ status, deadlines, totals, revision rules and quote ownership.
- `private.guard_rfq_update()` locks `sourcing_mode` once commercial quotes have arrived.
- Existing company ownership, quote privacy, acceptance workflow and order traceability remain unchanged.

## Marketplace workflow

`Company publishes RFQ → eligible approved providers discover it → providers submit competing quotes → company compares → company accepts one quote → executable order is created`

Private sourcing remains available:

`Company creates invite-only RFQ → operations/provider matching → provider invitations → quotes → selection → order`

## Frontend changes

- Company RFQ screen now defaults to **Open Marketplace** and can optionally use invite-only sourcing.
- Provider RFQ screen is now a **Marketplace Opportunities** board that combines open marketplace RFQs with private invitations.
- Marketplace providers can submit quotes without waiting for manual operations routing.

## Commercial impact

This removes the manual matching bottleneck from the primary flow and makes Gulf Catering Hub behave as a real two-sided marketplace. Operations can still moderate providers and use private sourcing for selected accounts.

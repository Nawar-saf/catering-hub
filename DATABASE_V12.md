# Gulf Catering Hub — Database V12 (Marketplace Success Fees)

Applied to the production Supabase project on 2026-10-09.

## Commercial model

Open-marketplace RFQs now create a platform success-fee ledger when a quote is selected and becomes an order.

Initial success fee: **5% of the accepted marketplace order value**.

Invite-only RFQs do not create marketplace success fees.

## New table

`marketplace_fees`

Tracks:

- linked order, company, provider and quote;
- gross marketplace order value;
- fee rate and calculated fee amount;
- currency;
- lifecycle status: `pending`, `accrued`, `invoiced`, `paid`, `waived`;
- payment timestamp and audit timestamps.

## Fee lifecycle

- Accepted marketplace quote creates an executable order and a `pending` marketplace fee.
- When the order becomes `completed`, the fee becomes `accrued`.
- If the order becomes `cancelled` or `provider_rejected`, the fee becomes `waived` unless it was already invoiced/paid.
- Existing `invoiced` and `paid` fee records are not downgraded by later order updates.

## Security

- Providers can read only their own fee records.
- Admin can read and update fee records.
- Providers/companies cannot insert or delete fee rows directly.
- Fee creation and synchronization happen server-side from the order lifecycle.

## Provider finance UI

The provider finance portal now shows:

- outstanding marketplace success fees;
- each marketplace deal's gross value;
- fee percentage and fee amount;
- fee status.

This creates the accounting foundation for later payment-gateway collection or manual provider invoicing without blocking the marketplace launch.

# DATABASE V19 — Fulfillment Tracking + Support

## Order execution tracking

`company_orders` now includes:

- `fulfillment_status`
- `fulfillment_note`
- `fulfillment_updated_at`

Supported execution states:

`scheduled → confirmed → preparing → ready → out_for_delivery → arrived → delivered`

`issue_reported` is available when either side needs operational intervention.

All execution changes are written to `order_fulfillment_events` with actor role, user, note and timestamp.

Providers may update only their assigned accepted orders through `public.update_order_fulfillment(...)`. Companies can use the same protected function only to report an issue. The database validates transitions instead of relying only on frontend buttons.

## Support center

New tables:

- `support_tickets`
- `support_messages`

Ticket ownership is tenant-scoped by company or provider. Operations admins can see the complete queue. Supported statuses:

`open → in_progress → waiting_user → resolved → closed`

Tickets can optionally reference an executable order or RFQ. Categories include order execution, RFQ, finance, account, provider verification, disputes and general support.

Messages are append-only for normal users. Internal admin messages can remain hidden from company/provider users.

## User interfaces

- `/company/orders.html` — company fulfillment tracking and execution timeline
- `/provider/orders.html` — partner execution workflow
- `/support.html` — role-aware support center for company, provider and operations users

Portal navigation links expose tracking and support after authentication.

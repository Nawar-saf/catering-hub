# Database V23 — Order Change Requests & Repeat Ordering

## Scope

V23 adds two post-selection marketplace loops that reduce off-platform coordination: controlled order changes and repeat ordering.

## Order change requests

`order_change_requests` records customer requests to modify or cancel an accepted order.

Key fields:

- `order_id`, `company_id`, `provider_id`
- `request_type`: `change | cancel`
- proposed event date, headcount and notes
- customer reason
- `status`: `pending | accepted | rejected | withdrawn`
- provider response and timestamps

Only one pending request is allowed per order.

### Workflow

`Company → change/cancel request → provider notification → provider accepts/rejects → company notification`

When a provider accepts:

- cancellation requests mark the order cancelled;
- change requests atomically apply the accepted event date/headcount/notes to the order.

The order update guard recognizes only the private `gch.order_change` workflow marker used by the controlled response function. Normal browser updates cannot use this bypass.

Public RPCs are SECURITY INVOKER wrappers around private workflow functions.

## Repeat ordering

The repeat-order UI copies the operational context of a prior order into a new RFQ rather than silently duplicating the old commercial agreement.

A buyer can:

- request a new quote from the same provider; or
- publish the repeated requirement to the open marketplace.

A new date and quote deadline are always required, so a historical price or availability is never treated as current automatically.

# Database V21 — Provider Availability & Direct RFQs

## Scope

V21 turns provider capacity into an explicit marketplace signal and adds a self-service direct-RFQ path.

### Provider availability

`catering_providers` now includes:

- `availability_status`: `available | busy | paused`
- `busy_until`
- `busy_extra_lead_hours`
- `accepting_marketplace_requests`

Providers can also create dated blackout windows in `provider_blackout_dates`.

`private.provider_available_for_event(provider_id, event_date)` is the canonical eligibility check for operational availability. Marketplace discovery, automatic notifications and admin matching all use it.

### Direct provider RFQs

A company may select an approved public provider and create an invite-only RFQ without operations staff manually routing it.

`public.create_direct_provider_rfq(...)` is an exposed SECURITY INVOKER wrapper around a private SECURITY DEFINER implementation. It validates:

- authenticated company tenant
- provider approval and active legal verification
- availability / blackout calendar
- capacity
- service geography
- RFQ deadline

The operation creates the RFQ and invitation atomically and emits a provider notification.

### Security

- Provider blackout dates use owner/admin RLS.
- Pending or unverified providers cannot enable marketplace intake.
- Public RPC wrappers remain SECURITY INVOKER; privileged workflow logic stays in the private schema.

# Gulf Catering Hub — Database V17 (Branch-Aware Marketplace Geography)

Applied to the production Supabase project on 2026-10-09.

## Goal

Make marketplace geographic eligibility more reliable when a company writes a neighborhood or address in the RFQ while a provider configures a broader city as its service area.

## New helper

`private.provider_serves_rfq(provider_id, rfq_id)` evaluates provider service areas against both:

- the RFQ free-text `location` field;
- the linked company branch `city`.

Providers with no configured service areas remain globally eligible.

## Where it is enforced

The same branch-aware geography rule is now reused by:

- `private.is_marketplace_rfq_available(...)` for provider marketplace visibility and quoting;
- `private.notify_marketplace_rfq_providers()` for opportunity alerts;
- `private.match_rfq_providers_impl(...)` for admin matching and marketplace rescue.

## Combined marketplace eligibility

A provider must now satisfy approval, request status/deadline, capacity, lead-time and geography checks before an Open Marketplace RFQ is treated as eligible.

This keeps discovery, notifications and admin matching aligned instead of having separate geographic logic in each path.

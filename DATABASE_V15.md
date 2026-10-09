# Gulf Catering Hub — Database V15 (Marketplace Service-Area Matching)

Applied to the production Supabase project on 2026-10-09.

## Goal

Prevent providers from seeing or being notified about marketplace RFQs outside the areas they say they serve.

## Changes

Marketplace eligibility now requires a service-area match whenever a provider has configured one or more service areas.

A provider remains globally eligible when `service_areas` is empty. Otherwise at least one configured service-area label must match the RFQ location text.

The service-area rule is now used consistently by:

- `private.is_marketplace_rfq_available(...)` — marketplace RLS / self-service quoting eligibility;
- `private.notify_marketplace_rfq_providers()` — automatic opportunity notifications;
- `private.match_rfq_providers_impl(...)` — admin rescue / invite-only provider matching.

## Combined eligibility

An Open Marketplace opportunity now checks:

1. provider is approved;
2. RFQ is open and not expired;
3. provider capacity can handle the requested headcount;
4. provider lead time fits before the event;
5. provider service area matches the RFQ location when service areas are configured.

This reduces irrelevant opportunity noise and improves marketplace quote quality before adding deeper cuisine or live-availability matching.

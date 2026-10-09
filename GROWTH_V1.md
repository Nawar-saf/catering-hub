# Gulf Catering Hub — Growth Layer V1

Shipped on 2026-10-09.

## Objective

Move the project from a technically complete marketplace toward real two-sided liquidity without adding unrelated product scope.

## Buyer acquisition surfaces

High-intent public pages now route companies directly toward the RFQ composer:

- `/marketplace.html`
- `/corporate-catering-muscat.html`
- `/employee-meals-muscat.html`
- `/event-catering-muscat.html`

All are included in `sitemap.xml`.

## Provider acquisition surfaces

- `/catering-opportunities-oman.html` explains supplier opportunities, free quote submission and the current 5% open-marketplace success fee.
- `/providers.html` is a searchable public directory of approved providers.
- `/provider.html?id=<provider_uuid>` is a shareable public provider profile.
- Approved providers get a direct `ملفي العام` link inside the provider portal.

## Admin supplier recruitment tool

Operations now exposes `/inbox/growth.html`.

An admin can enter a real catering company name, contact name and email, review the recruitment message, explicitly confirm, and send one branded supplier invitation.

Email delivery is handled by the authenticated Supabase Edge Function:

- `provider-invite`
- source: `supabase/functions/provider-invite/index.ts`
- JWT required
- server checks `user_profiles.role = admin`
- delivery uses the existing `BREVO_API_KEY`
- provider CTA routes to `/provider/?next=rfq`

The tool intentionally does not auto-send bulk unsolicited email. Each external invitation requires an explicit admin action.

## Marketplace conversion improvements

- company marketplace intent persists through signup/email confirmation/onboarding;
- after company onboarding, the RFQ composer opens directly;
- provider marketplace intent routes approved providers directly to Marketplace Opportunities;
- provider quote form discloses the current 5% Marketplace success fee before submission;
- public terms now describe Open Marketplace, Invite Only and the success-fee lifecycle.

## Current operating bottleneck

The marketplace transaction, revenue and monitoring layers exist. The next constraint is real liquidity: approved supplier coverage and genuine corporate RFQs. Operations should track:

- approved active providers;
- open marketplace RFQs;
- RFQs with zero quotes;
- quote depth per RFQ;
- time to first quote;
- RFQ-to-selection rate;
- marketplace GMV;
- accrued and collected success fees.

# Gulf Catering Hub — Database V10 (Activity + Notifications)

Applied to production Supabase on 2026-10-09.

## Migration

- `20261009123031_activity_and_notifications_v10`

## Activity timeline

`activity_events` stores an append-only operational timeline for important business events. Events can be scoped to a company, a provider, or both and include:

- company-order creation/status changes;
- RFQ creation/status changes;
- provider invitations;
- quote submission/acceptance;
- purchase-order creation/status changes;
- invoice creation/status changes;
- payments;
- recurring-meal delivery transitions;
- provider reviews.

Company users only read events for their company. Providers only read events for their provider account. Platform admins can read all events.

## In-app notifications

`notifications` provides company/provider/admin in-app notifications with:

- audience;
- event type;
- title/body;
- destination link;
- read timestamp.

Authenticated users can only read/update notifications within their RLS scope. The notification update guard freezes business fields so clients can only move the read timestamp forward rather than rewriting message content or ownership.

Current generated notifications include:

- new assigned order → provider;
- RFQ invitation → provider;
- submitted quote → company;
- accepted quote → provider;
- issued PO → provider;
- submitted invoice → company;
- invoice approval/rejection/payment-state updates → provider;
- employee-meal delivery → company;
- meal confirmation/cancellation → provider;
- completed-order review → provider.

## UI surfaces

- `/company/activity.html` — company notifications and timeline.
- `/provider/activity.html` — provider notifications and timeline.
- `/inbox/activity.html` — operations-wide activity timeline with category filters.

## Printable procurement records

V10 also adds a client-side secured document renderer:

- `/document.html?type=po&id=<uuid>`
- `/document.html?type=invoice&id=<uuid>`

The page reads data using the signed-in user's normal Supabase session, so existing RLS decides whether the record can be rendered. It supports browser print / Save as PDF.

The invoice view is explicitly labeled as an operational invoice record. The legally valid tax invoice remains the provider's responsibility under applicable requirements.

## Security / production verification

- `activity_events` is read-only to browser users; event creation occurs through guarded database triggers.
- `notifications` is not anonymously accessible.
- Company/provider notification reads are tenant-scoped through RLS.
- Supabase Security Advisor reports no new database/RLS findings after V10.
- Performance Advisor reports only expected `unused_index` findings for new/low-traffic indexes.
- The account-level Auth warning `Leaked Password Protection Disabled` remains outside schema code.

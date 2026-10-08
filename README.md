# Gulf Catering Hub — V5

Static corporate catering MVP connected to Supabase.

## Pages
- `/`: approved supplier packages, custom catering enquiries, employee-meal enquiries.
- `/company/`: company profile, branches, monthly spending summary, order approvals and recurring meal requests.
- `/provider/`: supplier registration, supplier packages, instant publication for verified suppliers and assigned-order fulfillment.
- `/inbox/`: operations login, public enquiries, provider verification/package oversight, assignments and recurring plans.

## Deployment
Publish the repository root on GitHub Pages. Paths are relative and support `/catering-hub/` hosting.
The Supabase browser client is pinned to 2.117.2. Only the public anon key is included.
The V5 schema has been applied to the existing project. Do not blindly rerun the bootstrap SQL against an unrelated database.
Database migration history: `catering_v5_portals_and_access_control`, `restrict_internal_rls_event_trigger_execution`.
Internal authorization functions live in the non-exposed `private` schema. RLS is enabled on all eight tables.
The existing operations account retains administration access. Passwords were not changed.
Customer/provider accounts register through their respective portals; email verification follows Supabase Auth configuration.

## Supported workflows
Company owner request → automatic internal approval → operations assigns an approved provider → provider accepts/rejects → accepted order is completed.
Verified provider package → immediate publication, with supplier-controlled pause/resume. New providers require initial verification.
Employee meal plan → company request → operations activation or cancellation.
Public enquiries remain in the operations inbox and are coordinated by the operations team.

## Current scope
- One owner login per company/provider; separate employee seats and delegated approval are not implemented.
- Budgets are reporting values, not payment or spending-limit enforcement.
- Recurring plans record the agreed program; they do not automatically dispatch daily orders.
- No online payment or instant availability guarantee. Requests require confirmation.
- No fabricated suppliers or packages; the marketplace starts empty until operations approves real offers.
- The request helper extracts explicit guest counts/budgets locally; it does not call an AI model.

## Validation
JavaScript syntax and DOM interaction checks cover the four pages.
Rollback-only database tests exercise registration roles, tenant isolation, provider approval, package publication, order fulfillment, recurring-plan access and public-enquiry privacy.
Existing requests and accounts are preserved; test accounts and rows are rolled back.

## Auth configuration follow-up
Supabase's optional leaked-password protection is currently disabled. Review the feature and plan availability in the project Auth settings:
https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Operational roadmap
1. Consolidate public enquiries and company orders in an operations workflow without breaking existing records.
2. Add provider quotation and customer confirmation with an auditable status history.
3. Add notifications for assignment, provider response and confirmed orders.
4. Add optional company seats and delegated approval; owner requests remain automatic.
5. Schedule recurring meal deliveries only after explicit start dates, service days and provider confirmation are captured.

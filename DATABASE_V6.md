# Gulf Catering Hub — Production V6

Production database hardening was applied to Supabase on 2026-10-09 through migration history.

Applied migrations:

1. `gch_production_hardening_v6` (`20261009000914`)
2. `validate_user_profile_role` (`20261009001755`)
3. `gch_advisor_cleanup_v6` (`20261009001838`)

The V6 production migration adds company approval configuration and member foundations, structured `catering_requests`, provider-safe public profiles, provider-safe order snapshots, recurring-meal scheduling fields, bilingual/commercial package fields, package review guards, public request rate limiting, and RLS/privacy hardening.

`supabase-v6-advisor-cleanup.sql` contains the follow-up advisor cleanup and is safe to keep alongside the base `supabase-v5-schema.sql` for reference.

The canonical applied SQL is also retained in Supabase migration history. Before recreating a fresh environment, pull migration history/schema from the production project rather than assuming the historical V5 file alone represents current production state.

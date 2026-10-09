# Gulf Catering Hub — Database V9 (Provider Performance + Meal Operations)

Applied to production Supabase on 2026-10-09.

## Migration

- `20261009122310_provider_performance_and_meal_operations_v9`

## Provider performance model

`catering_providers` now maintains operational metrics:

- `review_count`
- `average_rating`
- `completed_orders_count`
- `accepted_orders_count`
- `rejected_orders_count`
- `acceptance_rate`
- `on_time_rate`
- `avg_response_minutes`
- `performance_score`

Metrics are refreshed by database triggers when relevant order states or provider reviews change.

### Performance score

The initial score combines:

- company rating — 55% of the modeled score;
- provider acceptance rate — 20%;
- on-time delivery feedback — 15%;
- response-speed component — 10%.

Providers with no operating history retain a neutral internal baseline until real data is available.

The RFQ matching engine now adds provider `performance_score` as an additional ranking signal after eligibility checks for service area, capacity and lead time.

## Provider reviews

`provider_reviews` stores one company review per completed order.

A review can include:

- overall rating (1–5);
- food-quality rating;
- communication rating;
- on-time flag;
- comment.

The database derives company/provider from the completed order and prevents review creation for unrelated or unfinished orders.

RLS allows:

- the company to read/write reviews for its orders;
- the provider to read its reviews;
- platform admin to read/manage all reviews.

## Employee-meal operations

`meal_plan_occurrences` converts an active recurring meal plan into dated operating records.

Each occurrence stores:

- plan / company / branch / provider;
- service date and delivery time;
- employee count;
- lifecycle status: `scheduled`, `delivered`, `confirmed`, `missed`, `cancelled`;
- provider/company notes;
- delivery and confirmation timestamps.

`generate_meal_occurrences(plan_id, days)` creates up to 90 days of dated occurrences from the plan's weekdays/start/end dates. Activation of a plan automatically creates the first 30-day operating window. Subsequent generation is idempotent through a `(plan_id, service_date)` unique constraint.

### Delivery transitions

Provider:

- `scheduled → delivered`
- `scheduled → missed`

Company:

- `delivered → confirmed`
- `scheduled → cancelled`

Structural fields cannot be rewritten through client updates.

## UI surfaces

- `/company/reports.html` — spend by provider/branch, RFQ savings estimate, completed-order review queue and meal-delivery confirmation.
- `/provider/performance.html` — SLA score, reviews, response/acceptance metrics and daily meal-delivery operations.
- `/inbox/performance.html` — provider leaderboard and delivery exceptions for operations.

## Production checks

After V9:

- Supabase Security Advisor reports no new database/RLS findings.
- Performance Advisor reports no missing foreign-key indexes introduced by V9.
- `unused_index` notices remain expected for new tables/indexes until live traffic exercises them.
- The account-level Auth warning `Leaked Password Protection Disabled` remains outside schema code.

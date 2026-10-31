# Private visit analytics — operational reference

Site: https://amirrgb.github.io/
Collector: https://amirrajabi-site-analytics.amirrgb369.workers.dev
Cloudflare account ID: 460c23f6321fdcd422384772a120257d
D1 name: amirrajabi-site-analytics
D1 ID: fa703c27-61a6-43de-af40-63e998cd3500
Worker: amirrajabi-site-analytics
Consent version: 2026-10-30.v1

## Reporting in a future ChatGPT conversation
Use the connected Cloudflare API (D1 Query endpoint), never a public webpage.
Account and database IDs above are resource identifiers, not credentials.
No public dashboard or GET endpoint exposes visitor records.
Start with aggregated reports. Return raw IP addresses only when needed and explicitly requested.

API: POST /accounts/ACCOUNT_ID/d1/database/DATABASE_ID/query
Use parameterized SQL. The live tables are page_counts, visits, events and analytics_config.
Filter `is_test=0`; dates are UTC ISO 8601. Convert to Asia/Tehran when requested.

Examples:

```sql
SELECT day,page_views FROM page_counts ORDER BY day DESC;

SELECT substr(first_seen,1,10) AS day, count(*) AS visits,
 count(DISTINCT visitor_id) AS browsers,
 round(avg(active_ms)/1000.0,1) AS avg_active_seconds,
 round(avg(visible_ms)/1000.0,1) AS avg_visible_seconds,
 round(avg(max_scroll),1) AS avg_scroll_percent
FROM visits WHERE is_test=0 GROUP BY day ORDER BY day DESC;

SELECT country, count(*) AS visits FROM visits
WHERE is_test=0 GROUP BY country ORDER BY visits DESC;

SELECT e.kind, e.target, count(*) AS events FROM events e
JOIN visits v ON e.visit_id=v.visit_id WHERE v.is_test=0
GROUP BY e.kind,e.target ORDER BY events DESC;

SELECT e.section,count(*) AS views FROM events e
JOIN visits v ON e.visit_id=v.visit_id
WHERE v.is_test=0 AND e.kind='section_view'
GROUP BY e.section ORDER BY views DESC;
```

## Consent and retention
Before explicit acceptance, only page_counts is incremented once per page load (date + total, no individual record or identifier). Detailed visits/events require explicit acceptance. Reject and GPC/DNT disable further optional collection. Never describe inactivity as consent.
No automatic database expiry or deletion schedule, per owner instruction.
Preference is renewed after 180 days; records themselves do not expire.
A visitor can withdraw or delete visits matching their random visitor ID from the footer Privacy control.
See /privacy.html for the notice and data inventory.

## Security and reliability
Exact-origin CORS; explicit consent/version; capped streaming body (16 KiB);
allowlisted events/sections/targets; bounded field sizes; parameterized D1 statements;
rate-limit binding; no client credential and no public analytics read route.
IDs and client metrics are untrusted, not identity proof. Origin headers can be spoofed outside browsers.
No raw form inputs, fingerprinting, complete referrer URLs or query strings are stored.
Anonymous counter route /v1/count accepts only an empty object and writes only the UTC day + counter. Rate-limiting may transiently use the incoming IP at Cloudflare; IP is not written to page_counts.
Console errors contain no raw request data. Invocation logs disabled.
No third-party JS dependency is loaded.

Click on CV means link interaction, not a verified completed download.
Elapsed time includes inactive/background time; visible time excludes hidden time;
active time is approximate visible+focused+recent input time.
Detailed visits/events cover only consenting observable visits. page_counts is a separate unlinked page-load total; it is not unique visitors and may include bots/reloads. Last messages can be lost.

## Deployment
Worker source: worker.js
Configuration: wrangler.jsonc (no tokens). API credentials stay in connected account.
Do not add automatic editor tasks, repository hooks or workflows.
Frontend: /assets/analytics.js
Main-page change: one deferred local script; CSS/content retained.
Privacy notice and a compact consent control are the only intentional visible additions.

Tests: Worker validation tests and simulated client consent tests were run in memory;
a real consenting synthetic visit was accepted by the live Worker and verified in D1.
Synthetic records are flagged is_test=1 or removed.

## Privacy UI verification (31 October 2026)
Banner spans viewport minus 12 px on each side. Manage Cookies includes a sliders icon; Accept uses the dark site color. No Necessary only action is shown. Manage opens a native accessible dialog with separate anonymous/detailed controls, save, reject-optional and deletion actions.
Desktop 1440 px: banner width 1416 px. Mobile 375 px: banner width 351 px.
Browser-rendered tests verified icon, labels, no pre-consent visitor ID, anonymous empty-payload-only default, rejection, re-opening preferences, and explicit acceptance enabling details. Test transport was mocked so these UI tests did not write personal or synthetic visits to production.

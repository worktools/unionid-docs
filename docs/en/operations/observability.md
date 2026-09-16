# Metrics, explain, and events

Use `explain` to inspect the access plan, then `explain analyze` for a value-free execution profile. High examined-to-returned ratios suggest indexing or earlier filtering. High working memory suggests smaller pages/batches or fewer blocking stages. Index-entry counts confirm whether a composite index is useful.

`ConcurrentEngine::metrics_snapshot()` exposes versioned, cardinality-bounded request, error, latency, concurrency, connection, and receipt metrics. The optional `metrics` feature only renders Prometheus text and never opens an endpoint. Protect the endpoint and avoid table, query, parameter, or request-ID labels.

`ConcurrentEngine::with_observer` emits exactly one value-free terminal event per core request and sampled slow-query events. Request IDs are absent by default; an explicit HMAC key enables irreversible `hmac1:` correlation.

Observer callbacks are synchronous. Copy the small event to a bounded channel and return. Applications own retention, queue, disk, and label bounds. `storage_outcome_uncertain` requires reopen and check.

Troubleshoot from aggregate metrics, to explain/analyze, to temporary slow-event sampling. Never enrich diagnostics with business values.

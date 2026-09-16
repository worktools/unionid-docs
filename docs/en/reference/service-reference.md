# Complete service and resource-boundary reference

unionid exposes one Engine through TCP/HTTP adapters but does not embed a public-internet identity system. Production deployment must supply authentication, TLS, traffic control, deadlines, backup, and shutdown behavior explicitly.

## Trust boundary

Listen on loopback or a private network. Put mTLS, identity mapping, tenant/IP limits, and audit policy in a reverse proxy or service mesh. Never expose the raw port publicly. Query source, parameters, rows, cursors, operation capabilities, and idempotency keys may be sensitive and must not enter ordinary access logs.

Use a real read-only Engine for replicas instead of merely hiding mutation routes. Verify read-only state through introspection.

## Fixed defensive limits

| Resource | Limit |
| --- | ---: |
| TCP connections | 64 |
| concurrent consistent read snapshots | 8 |
| active cancellable reads | 64 |
| terminal tombstones | 256 for 60 seconds |
| stream producer queue | 8 frames / 16 MiB |
| one stream frame | 16 MiB |
| one stream total | 100,000 rows / 256 MiB |
| request frame | `6 × 1 MiB + 256 B` |
| query source | 1 MiB / 100,000 tokens / 64 levels |
| one typed value | 16 MiB / depth 64 / 1,000,000 collection items |
| working / result rows | 250,000 / 100,000 |
| page | 1,000 rows / 16 sort keys / 8 KiB cursor |
| DML returning | 100,000 rows / 8 MiB wire rows |
| introspection / TCP response | 1 MiB / 16 MiB |
| request ID | 1 KiB |
| idempotency key / receipt | 256 B / 1 MiB |
| receipt store | 10,000 entries / 64 MiB |
| request deadline | 25 seconds |
| idle connection / socket write | 30 / 5 seconds |
| match coverage analysis | 100,000 steps |

These are rejection boundaries, not target operating points. Capacity plans need headroom. Current evidence treats roughly 10k rows as comfortable and 100k as a tested upper bound, not a write-latency objective.

## Concurrency, streams, and backpressure

Reads hold immutable committed snapshots, at most eight concurrently; writes and maintenance serialize. Bound connections/frames at admission, apply execution deadlines, and honor bounded channels and socket-write timeouts. A slow client must not retain a snapshot or memory indefinitely.

For a cancellable stream, the server sends and flushes `accepted` with a server-issued `o1` capability, then `schema`, zero or more `row` frames, and exactly one terminal `complete` or `error`. Cancel returns `accepted`, `already_terminal` with outcome, or `unknown`. The 128-bit capability is an in-process bearer secret: never persist or log it. Disconnect has no implicit resume, and a partial stream is not a page cursor.

## Graceful shutdown

SIGINT/SIGTERM should stop admission, wake queued work with a shutdown error, cancel active reads at control checkpoints, wait for bounded workers/flushes to a deadline, handle serial writes by certainty rules, emit only value-free final statistics, and then close storage. Embedded applications can connect the same `AtomicBool` flow through `server::serve_until` / `serve_until_concurrent` and receive `ServerStats`.

## Metrics and observer

`ConcurrentEngine::metrics_snapshot()` is a versioned, process-local, weakly consistent snapshot. Operation classes are fixed to read, write, introspection, receipt, stream, and maintenance. Error-code cardinality is capped at 64 plus overflow. Metrics contain counts, errors, latency histograms, concurrency, connections, and receipt capacity—never source, parameters, rows, keys, cursors, or capabilities.

The optional `metrics` feature renders Prometheus text but opens no endpoint. Mount it on an authenticated internal route. Counters reset at process restart and are not a durable audit log.

`ConcurrentEngine::with_observer` emits exactly one value-free terminal event per core request and optionally a bounded-sampled slow-query event above an explicit threshold. It retains access/stage kinds, plan/work counts, timing, and terminal outcome. Request ID is omitted by default; if correlation is required, retain only an HMAC digest with a separate secret. The optional tracing feature starts no collector, and observer/export failure must never change commit outcome.

## Production checklist

- Pin the binary and record protocol/storage/codec support.
- Rehearse migration, complete restore, and check on an isolated copy.
- Bind privately; enforce mTLS, authentication, body size, and rate limits upstream.
- Keep upstream deadline at or below 25 seconds, idle at or below 30, and write timeout at or below 5.
- Place live data, backup repository, and logs in separate failure domains.
- Alert on `E_BUSY`, `E_STORAGE_REOPEN_REQUIRED`, integrity failure, receipt capacity, and queue saturation.
- Rehearse SIGTERM, idempotent retry after lost response, restore, and cursor expiry.

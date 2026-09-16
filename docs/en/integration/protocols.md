# TCP, HTTP, and streaming

TCP uses one UTF-8 JSON request line and one response line. HTTP adapters reuse the same transport-neutral request and response:

```json
{
  "version": 2,
  "request_id": "list-1",
  "query": "from tasks | filter id == $id | take 1",
  "params": {"id": {"int": 1}}
}
```

Responses carry typed columns and rows, schema revision/hash, optional page cursors, and structured errors. `request_id` identifies an attempt; durable exactly-once effect uses a separate `idempotency_key`.

Protocol v1 covers foundational scalars and ADTs. V2 adds lossless UUID, bytes, date, timestamp, duration, and decimal values. Unknown tags, lossy JSON numbers, and wrong types fail before execution.

The HTTP adapter does not install authentication, route authorization, TLS, or rate limits. Validate a principal and classify routes as read, write, or receipt operations before invoking the router.

## Bounded NDJSON streams

Stream protocol v1 emits `accepted`, `schema`, zero or more `row` frames, then exactly one `complete` or `error`. Server-issued 128-bit cancel capabilities are bearer values and are not persisted. Registry size, channels, bytes, deadlines, and idle writes are bounded. A partial stream has no implicit resume and is not CDC.

Page cursors are opaque HMAC tokens bound to database identity, schema, sequence, query, parameters, and page size. Store and return them unchanged; a successful write expires earlier cursors.

Keep the raw server on loopback. Remote access belongs behind mTLS or an authenticated HTTP gateway because raw TCP has no user or role model.

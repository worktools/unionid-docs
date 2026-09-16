# Complete data protocol reference

## Ordinary requests

TCP carries one physical JSON line per request and response. HTTP `POST /v1/query` uses the same JSON body and semantics.

```json
{
  "version": 2,
  "request_id": "task-42",
  "query": "from tasks\nfilter id == $id\nselect {id, title}",
  "params": {"id": {"type": "int", "value": "9007199254740993"}},
  "schema": {"revision": 3, "hash": "sha256:..."}
}
```

| Field | Contract |
| --- | --- |
| `version` | 1 or 2; otherwise `E_PROTOCOL_VERSION` |
| `request_id` | UTF-8, at most 1 KiB; correlates one attempt, never deduplicates |
| `query` | Complete source, at most 1 MiB |
| `params` | Optional named typed values, exactly matching `$name` |
| `schema` | Optional revision/hash precondition; mismatch returns `E_SCHEMA_CHANGED` before scanning |
| `idempotency_key` | Optional for mutation, 1–256 UTF-8 bytes |
| `page` | Optional `{limit,direction,cursor}`; mutually exclusive with a source `page` |
| `introspect` | `schema/tables/types/storage`; exclusive with query/params |
| `receipts` | Independent status/prune operation; exclusive with query |

## Typed wire values

i64, IDs, and finite f64 values are strings so JSON number precision cannot alter them. Null, `None`, an empty list, and a unit variant have different shapes.

```json
{"type":"int","value":"-9223372036854775808"}
{"type":"option","value":null}
{"type":"list","items":[]}
{"type":"variant","name":"Pending","variant_id":"16","args":[]}
{"type":"named","type_id":"9","value":{"type":"variant","name":"Pending","variant_id":"16","args":[]}}
```

When context determines a parameter type, `type_id`/`variant_id` may be `"0"` and the binder resolves by name. Results always contain stable catalog IDs. Protocol v2 adds canonical UUID, bytes, date, timestamp, duration, and decimal envelopes.

## Responses and bounded encoding

A success response contains request version/id, `ok`, message, columns, typed rows, schema identity, and operation-specific fields such as `affected_rows`, `upsert_actions`, `page`, `idempotency`, `introspection`, or analysis. A failure preserves request ID and current schema and returns structured `error {code,message,span?}`.

A complete TCP response is capped at 16 MiB and introspection at 1 MiB. A bounded writer replaces an oversized result with a small `E_LIMIT`; it does not allocate an unbounded JSON buffer.

## Idempotent mutations

The canonical digest covers version, exact query UTF-8, sorted typed parameters, and schema precondition. It excludes request ID, the key itself, and deadline. Equal key/digest replays the complete successful response with `replayed: true`; equal key with a different digest returns `E_IDEMPOTENCY_CONFLICT`. Only a failure known to occur before transaction commit is guaranteed not to occupy the key; after an uncertain commit, the key and receipt may already be durable.

After an uncertain commit, reopen and retry with exactly the same query, wire parameters, schema precondition, and key. The receipt store is bounded to 10,000 entries / 64 MiB and one receipt to 1 MiB. At capacity, a new key returns `E_IDEMPOTENCY_CAPACITY`, while existing keys remain replayable. There is no automatic TTL or LRU.

## Structured pages and introspection

The first structured page omits cursor. The service normalizes it to the final pipeline stage and accepts it only for one read pipeline. It cannot be combined with mutation, introspection, receipt operations, idempotency keys, or source-level page.

```json
{"version":1,"request_id":"inspect-1","query":"","introspect":"storage"}
```

Introspection returns schema identity, canonical schema, table/type/field metadata, storage mode, read-only status, migration head, and maintenance state. It does not run a query or mutate data.

## Stream protocol v1

The independent stream query/cancel envelope emits:

```text
accepted(operation capability)
schema(columns)
row(value)*
complete(counts)
```

Every path has exactly one terminal `complete` or `error`. The server-issued 128-bit capability is a bearer secret: never persist or log it. Bounds are 64 registered operations, 256 terminal tombstones retained for 60 seconds, an 8-frame / 16 MiB channel, 16 MiB per frame, and 100,000 rows / 256 MiB total. While backpressured, the producer checks cancellation, shutdown, and deadline every 100 ms.

The snapshot is released before a complete result enters emission. A partial stream has no implicit resume; use stable page cursors for reliable continuation.

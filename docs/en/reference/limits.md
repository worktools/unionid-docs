# Errors, limits, and budgets

| Code or state | Meaning | Caller action |
| --- | --- | --- |
| `E_SCHEMA` | invalid schema/type | fix declaration or migration |
| `E_CONSTRAINT` | key/unique/shape failure | fix input; no partial commit |
| `E_ARITH` | overflow, division by zero, non-finite float | fix expression/input |
| `E_READ_ONLY` | mutation rejected | use an authorized writer |
| `E_BUSY` | file already has a writer | stop the duplicate owner |
| `E_INDEX_KEY_LIMIT` | durable key too large | shorten indexed values or remodel |
| cursor expired | data/schema/query changed | restart traversal |
| outcome uncertain | commit status unknown | reopen, check, inspect receipt/key |

Important bounds include recursion depth 64, 1–16 composite-index components, 8192-octet indexed byte leaves, 64-KiB complete index keys, 16-MiB typed values, 100,000 rows per batch, and up to eight consistent `ConcurrentEngine` readers. Service registries, streams, memory, and deadlines are also bounded.

One request is atomic; separate requests do not share a snapshot. A cursor is not history, a stream is not CDC, and read-only execution is not filesystem or network authorization.

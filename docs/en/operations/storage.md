# redb storage and failure semantics

Only one writable owner may open a database file; competing processes receive `E_BUSY`. Use `--read-only` or `Engine::open_redb_read_only` for read-only instances.

## Commit outcomes

- Failure before commit: definite rollback; retry only after correcting the cause.
- Successful commit: data, indexes, schema/ledger, and receipts become atomically visible.
- Commit returns an error: outcome is uncertain; the engine closes and prevents more writes.

After an uncertain outcome, reopen and run `check --db`, then inspect a business key or idempotency receipt. Never treat it as an ordinary rollback.

Rows use stable, table-local monotonic `u64` RowIds. Deleted IDs leave legal gaps and are never reused. Ordinary mutations share persistent row/index/receipt roots and write only changed stable keys. DDL, migration, upgrade, restore, and receipt prune use explicit rebuild or maintenance paths.

Storage format, component codecs, protocol versions, and application schema revision are independent. Unknown formats fail before modification.

Around 10k rows is the comfortable operating range. 100k has been tested for writes, migration, and checking but has materially higher latency and memory. Measure real schemas and value distributions on production copies.

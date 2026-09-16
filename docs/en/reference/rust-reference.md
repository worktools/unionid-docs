# Complete Rust API reference

The embedded API, CLI, and network adapters share Engine semantics, so applications do not maintain a second type-conversion or execution model.

## Engines and atomicity

```rust
use unionid::Engine;

let mut temporary = Engine::memory();
let mut durable = Engine::open_redb("app.redb")?;
let mut replica = Engine::open_redb_read_only("replica.redb")?;
# Ok::<(), Box<dyn std::error::Error>>(())
```

Memory is appropriate for tests and ephemeral services. `open_redb` obtains single-writer ownership and validates visible durable state. Read-only mode retains full parse/bind behavior but rejects mutation with `E_READ_ONLY` before candidate state or a persistent transaction. A script either publishes one complete committed root or leaves the original root unchanged.

## Prepare, bind, and decode

```rust
use std::collections::BTreeMap;
use unionid::{Engine, Value};

#[derive(serde::Serialize)]
struct NewTask { id: i64, title: String }
#[derive(serde::Deserialize)]
struct Task { id: i64, title: String }

let mut engine = Engine::open_redb("app.redb")?;
let insert = engine.prepare("insert tasks $row\nreturning")?;
let response = engine.execute_prepared(
    &insert,
    BTreeMap::from([("row".into(), Value::from_serde(&NewTask {
        id: 1, title: "ship docs".into(),
    })?)]),
);
let rows: Vec<Task> = response.typed_rows()?;
# Ok::<(), Box<dyn std::error::Error>>(())
```

Prepare binds parameter types, complete DML structure, and result schema before scanning and records schema revision/hash. Execution after schema drift fails explicitly. `Value::from_serde` preserves struct, enum, option, tuple, and list shape without leaking nominal IDs into serde representation. `typed_rows` uses one path for reads and mutation `returning`.

Missing/extra parameters, unknown variants, overflow, and constraint mismatch are contract failures, never implicit database coercions. Use unionid scalar wrappers for UUID, bytes, date, timestamp, duration, and decimal; precision/scale and explicit temporal offsets remain part of the type.

## Keys, pages, and idempotency

`fetch_by_key` / `typed_fetch_by_key` perform complete typed-key reads. `PageSpec` cursors require the same query, parameters, order, and size on continuation; any successful mutation makes old cursors fail as stale.

`execute_idempotent_with_params` accepts a separate idempotency key. Equal key/canonical digest replays the original success and a different digest conflicts. Only a failure known to occur before transaction commit is guaranteed not to occupy the key; after an uncertain commit, the key and receipt may already be durable. A persistent Engine stores effect and complete success receipt in one transaction. `request_id` correlates one attempt and cannot replace the idempotency key.

## Concurrent services

```rust
use unionid::{ConcurrentEngine, Engine};

let engine = ConcurrentEngine::new(Engine::open_redb("app.redb")?);
let metrics = engine.metrics_snapshot();
# Ok::<(), Box<dyn std::error::Error>>(())
```

`ConcurrentEngine` supports up to eight consistent immutable read snapshots outside the writer lock; writes and maintenance remain serial. Shared execution control checks deadlines, shutdown, and cancellation during admission, bind, and query loops. Async HTTP handlers should move synchronous Engine work to a blocking worker.

For cancellable streams, register the read, send and flush the server-issued capability, then start the operation. The capability is a bearer secret and must never enter logs, persistence, or metric labels.

## Transport-neutral protocol

`protocol::Request` / `Response` are the transport-neutral versioned data model used by TCP and HTTP adapters. `Request::with_serde_param` creates a typed wire value; `Response::typed_rows` / `typed_page` recover application values losslessly. Select protocol v2 only when a value requires its production-scalar envelope and both sides support v2.

## Generated contracts

```bash
unionid schema describe --file schema.unid --format json > schema.json
unionid schema rust --file schema.unid --output src/schema.rs
unionid query rust --schema schema.unid --dir queries --output src/queries.rs
```

Generated query code checks schema identity before prepare. `PortableContract::validate_type` reuses prepared-binding rules for input validation. Stable IDs are comparable only within one database lineage, never as global cross-project identifiers.

## Recovery boundary

- Failure before commit: definitely rolled back; bounded retry is possible.
- Error returned by redb commit: result is uncertain; the Engine closes and blocks further writes. Reopen and fully check.
- `E_BUSY`: another writer/maintenance owner exists; use bounded backoff.
- `E_SCHEMA_CHANGED`: regenerate or prepare again; never bypass it.
- `E_READ_ONLY`: routing or deployment policy; retrying the same instance is wrong.

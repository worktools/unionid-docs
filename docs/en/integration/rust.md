# Embedded Rust API

```rust
use unionid::Engine;

let mut memory = Engine::memory();
let mut durable = Engine::open_redb("data/app.redb")?;
let mut read_only = Engine::open_redb_read_only("data/app.redb")?;
```

`Engine` is shared by the embedded API, CLI, and services. Each execute call is an atomic script. Production code must inspect `QueryResponse.error` before consuming rows.

## Prepared serde parameters

```rust
#[derive(Serialize, Deserialize)]
enum State {
    Pending,
    Running { worker: String, attempt: i64 },
}

#[derive(Serialize, Deserialize)]
struct Task { id: i64, title: String, state: State }

let prepared = db.prepare("insert tasks $row\nreturning")?;
let response = db.execute_prepared(
    &prepared,
    BTreeMap::from([("row".into(), Value::from_serde(&task)?)]),
);
let rows: Vec<Task> = response.typed_rows()?;
```

Rust structs, enums, options, tuples, and vectors map to named ADTs without exposing internal nominal IDs in serde. Bind user values; do not build source strings from input.

Use `unionid::scalars::{Uuid, Bytes, Date, Timestamp, Duration, Decimal}` for production scalar identity. Wire protocol v2 is required for their lossless representation.

`ConcurrentEngine` runs reads outside the writer lock on up to eight immutable snapshots; mutations and maintenance remain serialized. Bound deadlines and shutdown, and keep observer callbacks short.

Persist recoverable summaries, bodies, and application revisions before updating runtime state. Schema revision, maintenance sequence, page cursor, and business revision are separate. Authentication, cache invalidation, WebSockets, and subscriptions remain application concerns.

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
use std::collections::BTreeMap;
use serde::{Deserialize, Serialize};
use unionid::{Engine, Value};

#[derive(Serialize, Deserialize)]
enum State {
    Pending,
    Running { worker: String, attempt: i64 },
}

#[derive(Serialize, Deserialize)]
struct Task { id: i64, title: String, state: State }

let mut db = Engine::open_redb("data/app.redb")?;
let task = Task {
    id: 1,
    title: "ship docs".into(),
    state: State::Pending,
};
let prepared = db.prepare("insert tasks $row\nreturning")?;
let response = db.execute_prepared(
    &prepared,
    BTreeMap::from([("row".into(), Value::from_serde(&task)?)]),
);
let rows: Vec<Task> = response.typed_rows()?;
```

Rust structs, enums, options, tuples, and vectors map to named ADTs without exposing internal nominal IDs in serde. Bind user values; do not build source strings from input.

## Inline `queries!` macro

Short queries owned by one crate can live directly in a Rust module. `unionid-query` and `unionid` must use the same exact version:

```toml
[dependencies]
serde = { version = "1", features = ["derive"] }
unionid = "=0.13.2"
unionid-query = "=0.13.2"
```

```rust
unionid_query::queries! {
    schema "schema.unid"

    query find_pending {
        from tasks
        filter state == Pending && priority >= $min_priority
        sort {-priority, id}
        select {id, title, state}
        take 20
    }

    query reprioritize_task {
        update tasks
        filter id == $id
        set priority = $priority
        returning {id, priority, state}
    }
}

use unionid::Engine;
let mut engine = Engine::open_redb("data/app.redb")?;

let rows = find_pending::find_pending(
    &mut engine,
    find_pending::FindPendingParams { min_priority: 3 },
)?;
```

At compile time the macro reads the schema (relative to the caller's `CARGO_MANIFEST_DIR`) and reuses the same parser, binder, and code generator as `.unid` files to produce shared ADTs, per-query Params/Rows, and execution functions. Unknown fields, wrong constructors, conflicting parameter types, and non-exhaustive matches fail Rust compilation, and edits to the schema or queries re-expand the macro. Generated calls still check schema revision/hash at runtime and return `E_SCHEMA_CHANGED` before a scan or write when the catalog has drifted.

The macro accepts one query or one DML per entry (optionally with a trailing `expect`). It never opens redb during compilation: applications whose stable IDs come from migrations and need bindings from the live catalog, plus cross-language, CLI, LLM, and larger query sets, keep using standalone `.unid` files with `unionid query rust --db`.

## Scalars, concurrency, and boundaries

Use `unionid::scalars::{Uuid, Bytes, Date, Timestamp, Duration, Decimal}` for production scalar identity. Wire protocol v2 is required for their lossless representation.

`ConcurrentEngine` runs reads outside the writer lock on up to eight immutable snapshots; mutations and maintenance remain serialized. Bound deadlines and shutdown, and keep observer callbacks short.

Persist recoverable summaries, bodies, and application revisions before updating runtime state. Schema revision, maintenance sequence, page cursor, and business revision are separate. Authentication, cache invalidation, WebSockets, and subscriptions remain application concerns.

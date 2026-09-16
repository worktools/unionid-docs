# Meet unionid

unionid is a lightweight Rust database that makes algebraic data types (ADTs) part of the database schema. It runs as an embedded Rust engine, a local redb database, or a standalone TCP/HTTP service.

## What it changes

Applications often represent state with a string and several nullable fields. A running task needs a worker and attempt; a completed task needs a result. Those rules usually exist only in application code.

unionid describes every legal shape in the schema:

```text
enum State {
  Pending
  Running {
    worker: text
    attempt: int
  }
  Done {
    result: text
  }
  Failed {
    message: text
    retryable: bool
  }
}
```

The database validates constructors, payloads, defaults, field paths, indexes, and migrations. Queries understand the same types and exhaustively match variants instead of treating ADTs as untyped JSON.

## Three ways to run it

| Entry point | Best for | Storage |
| --- | --- | --- |
| `Engine::memory()` | tests and temporary work | process memory |
| `Engine::open_redb` / `unionid run --db` | desktop tools and embedded apps | redb file |
| `unionid server` + TCP/HTTP adapter | multiprocess clients and controlled services | redb file |

All three share the parser, type checker, executor, and transaction semantics. Learn with the CLI, then move to Rust or a network boundary without rewriting schemas and queries.

## Current boundaries

- One machine, one database owner, serialized writes; `ConcurrentEngine` supports up to eight consistent read snapshots.
- Around 10,000 rows is the comfortable range. 100,000 rows is a tested upper bound, not a routine target.
- ADTs, indexes, aggregation, stable pagination, and bounded lookup are supported; general flattened joins, windows, and distributed execution are not.
- Users, roles, row permissions, subscriptions, CDC, and application caching remain application responsibilities.

## Suggested path

1. Complete [Getting started](./getting-started).
2. Learn the generated [project layout](./project-layout).
3. Model data with [types and values](/en/language/data-model).
4. Learn [queries](/en/language/queries) and [mutations](/en/language/mutations).
5. Choose the [CLI](/en/integration/cli), [Rust API](/en/integration/rust), or [network protocol](/en/integration/protocols).
6. Read [Operations](/en/operations/) before production.

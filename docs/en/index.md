---
layout: home

hero:
  name: unionid
  text: Model data with ADTs. Query it with pipelines.
  tagline: A complete path from a five-minute database to typed Rust integration, resumable migrations, stable pagination, and production operations.
  actions:
    - theme: brand
      text: Start in five minutes
      link: /en/guide/getting-started
    - theme: alt
      text: Read in order
      link: /en/guide/

features:
  - title: Schemas express business states
    details: Records, sums, options, lists, tuples, and finite recursion have stable identity, defaults, constraints, and migration semantics.
    link: /en/language/data-model
  - title: Queries understand ADTs
    details: Pipelines, exhaustive match, derive, aggregation, composite indexes, stable pagination, and explain share one type system.
    link: /en/language/queries
  - title: Development through production
    details: CLI, Rust, and TCP/HTTP share one Engine with backup, resumable migration, checks, compaction, metrics, and controlled networking.
    link: /en/operations/
---

## Start with one complete journey

Install unionid, generate a standalone project, then apply migrations, seed, query, reopen, check, back up, and restore:

```bash
cargo install unionid --locked
unionid init tasks
cd tasks
unionid project check --dir .
unionid migration apply --db data/tasks.redb --dir migrations
unionid run --db data/tasks.redb --file seed.unid
unionid run --db data/tasks.redb --file queries/list_running.unid
```

The documentation follows real user decisions: run it first, model and query data, choose an integration boundary, then operate and upgrade it safely.

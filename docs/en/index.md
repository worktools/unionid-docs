---
layout: home

hero:
  name: unionid
  text: Model data with ADTs. Query it with pipelines.
  tagline: A lightweight, type-safe Rust database that runs as an embedded engine, a local redb database, or a TCP service.
  actions:
    - theme: brand
      text: Start in five minutes
      link: /en/guide/getting-started
    - theme: alt
      text: Explore the data model
      link: /en/guide/

features:
  - title: ADTs belong in the schema
    details: Structs, enums, options, lists, tuples, and finite recursive types are checked by the database instead of hiding in untyped JSON.
  - title: Pipelines understand types
    details: Compose filter, match, derive, select, sort, aggregate, and page with type and exhaustiveness checks before scanning.
  - title: Embedded or served
    details: One Engine powers the Rust API, CLI, TCP, and HTTP over either in-memory or transactional redb storage.
---

## A schema that represents state precisely

```text
type State =
  Pending
  | Running {worker text, attempt int}
  | Done {result text}

type Task = {
  id int,
  title text,
  state State,
}

table tasks Task
  key id
```

Queries destructure variants directly. Adding a new shape cannot be silently ignored by an old exhaustive match.

```text
from tasks
filter match state {
  Running {attempt, ..} => attempt >= 2,
  _ => false,
}
select {id, title, state}
sort id
take 20
```

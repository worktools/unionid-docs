# Data model: make illegal states unrepresentable

unionid schemas combine product types (records and tuples) with sum types. Named types are nominal: two identical shapes with different type identities are not interchangeable.

```text
struct Contact {
  email: text
  nickname: Option<text> = None
}

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

struct Task {
  id: int
  title: text
  owner: Contact
  tags: List<text> = []
  state: State
  priority: int = 0
}

table tasks: Task {
  key id
}
```

Fields without defaults are required, including `Option<T>` fields: write `None` explicitly. Defaults are type-checked pure literals and cannot read another field, a parameter, a clock, or a function.

```text
insert tasks {
  id: 1
  owner: Contact {email: "alice@example.com"}
  state: Running {attempt: 2, worker: "local"}
  title: "ship docs"
}
```

Lists use `[1, 2]`, tuples `(1, "x")`, and positional payloads `Pair(1, "x")`. Expected enum types allow `Pending` or `Running {...}`; qualify standalone or ambiguous constructors as `State::Pending`.

## Keys and indexes

```text
create index tasks (state)

create unique index tasks (owner.email)

create index tasks (state, -priority, id)
```

Indexes contain 1–16 nested field paths. Component order and direction are identity. Unique indexes compare complete typed values; `None` is a value. Existing rows are checked before publishing a new unique constraint.

### Partial unique indexes

`create unique index ... if <predicate>` constrains only rows where the predicate is true. It fits optional emails, soft deletes, and identifiers that must be unique only while `Active`:

```text
create unique index users (email) if is_some email
create unique index users (email) if deleted_at == None
create unique index jobs (provider, external_id) if state == Active
```

An ordinary unique index treats `None` as a value, so at most one user may lack an email; `if is_some email` admits many `None` rows while each `Some(email)` stays unique. Inserts, upserts, updates, deletes, batches, and migrations check the final candidate state and roll back atomically on conflict. Text equality is exact; normalize case, whitespace, and Unicode at every application write boundary.

The planner uses a partial unique index only when the query filter mechanically implies its predicate; `explain` reports `index_predicate` and `predicate_proven`. Fresh databases default to storage format 10 and support this directly; older format 6/7 databases need an explicit `upgrade` to 10/11 first.

## Typed maps

`Map<text, T>` stores a bounded mapping from text keys to typed values, written with a `map {...}` literal:

```text
struct Account {
  id: int
  attributes: Map<text, text>
}

insert accounts {
  id: 1
  attributes: map {"plan": "pro", "region": "eu"}
}
```

Keys are `text` and values share one type. Maps have entry, byte, and depth budgets, and compare and persist in canonical UTF-8 key order, so literal order never affects equality. See [typed maps in queries](./queries#typed-maps) for the functions. There is no in-place keyed update, map pattern destructuring, or keyed secondary index yet; build and replace the whole map.

## Finite recursion

```text
enum Tree {
  Leaf(text)
  Branch {
    label: text
    children: List<Tree>
  }
}
```

Direct recursion needs a terminating path. `None` and the empty list can terminate. Mutual recursion, alias loops, shared object graphs, and cycles are unsupported. Values are finite trees with depth at most 64.

Types, fields, variants, tables, and indexes have stable, never-reused catalog IDs. Rename preserves identity; drop and recreate does not. Business keys and internal RowIds are separate.

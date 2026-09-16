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
  state: State::Running {attempt: 2, worker: "local"}
  title: "ship docs"
}
```

Lists use `[1, 2]`, tuples `(1, "x")`, and positional payloads `Pair(1, "x")`. Qualify ambiguous constructors as `State::Pending`.

## Keys and indexes

```text
create index tasks (state)

create unique index tasks (owner.email)

create index tasks (state, -priority, id)
```

Indexes contain 1–16 nested field paths. Component order and direction are identity. Unique indexes compare complete typed values; `None` is a value. Existing rows are checked before publishing a new unique constraint.

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

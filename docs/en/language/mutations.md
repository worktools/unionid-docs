# Mutations: atomic typed DML

```text
insert tasks {
  id: 1
  owner: Contact {email: "alice@example.com"}
  state: Pending
  tags: ["docs"]
  title: "ship docs"
}
returning {id, state}
```

Batch operations use `many` explicitly:

```text
insert many tasks $rows
returning {id, state}
```

`$rows` binds as `List<Task>`. Defaults are applied per row, then the whole batch checks keys, unique indexes, budgets, and deadlines. Any failure leaves no partial rows. One batch accepts at most 100,000 rows.

Upsert requires a primary key. A match replaces the complete typed row while preserving RowId; a miss allocates a new RowId. Batch upsert rejects duplicate input keys and reports actions in input order.

```text
update tasks
filter match state {
  Pending => true
  _ => false
}
sort {-priority, id}
take 10
set state = Running {attempt: 1, worker: "worker-1"}
returning {id, state}
```

Update and delete targets compose filter, match, sort, and take in source order. Multiple sets evaluate simultaneously from the old row. Nested paths, keys, and indexes update in one atomic request.

Parse, bind, arithmetic, constraints, budgets, deadlines, and pre-commit persistence failures roll back. A commit error has an uncertain outcome: the engine closes, and callers must reopen and check rather than blindly retry. Network-retried mutations should use durable idempotency keys; the data effect and receipt commit together.

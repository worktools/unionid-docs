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

## Business guards with `expect`

Follow a DML statement with `expect affected <op> <n>` to check how many rows the preceding insert, insert many, upsert, upsert many, update, or delete actually touched. Operators are `== != < <= > >=`; the right side is a nonnegative integer literal:

```text
update accounts
filter id == $from && balance >= $amount
set balance = balance - $amount
expect affected == 1

update accounts
filter id == $to
set balance = balance + $amount
expect affected == 1
```

A failed guard returns `E_EXPECTATION` and rolls back the whole script, including earlier writes, indexes, RowId allocation, and new receipts. The error carries a one-based `statement_index` (guards count as statements) and a source span. Insufficient funds, a missing recipient, or a stale version all map naturally onto guards. Unguarded zero-row mutations remain valid.

A guard must directly follow a DML statement; blank lines and comments keep adjacency, while a query, DDL, or second guard breaks it and returns `E_EXPECTATION_CONTEXT` before execution. Successful responses add ordered `statements` metadata (`index`, `kind`, optional `affected_rows`); a trailing guard keeps the preceding mutation's returning rows. Scripts are capped at 4,096 top-level statements and 512 KiB of summaries; use `insert many` for bulk loads. Static bindings and the `queries!` macro accept one DML plus a trailing guard; multi-write scripts use Engine/prepare, the CLI, TCP, or HTTP. Guards count rows only and do not replace complete domain rules. Legacy WAL mode rejects guarded scripts with `E_CONFIG`.

## Atomic scripts and failures

Parse, bind, arithmetic, constraints, budgets, deadlines, and pre-commit persistence failures roll back. A commit error has an uncertain outcome: the engine closes, and callers must reopen and check rather than blindly retry. Network-retried mutations should use durable idempotency keys; the data effect and receipt commit together.

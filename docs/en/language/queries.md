# Queries: pipelines and stable traversal

Stages execute in source order. The planner uses primary and secondary indexes only when doing so preserves that order and never crosses semantic stage boundaries.

```text
from tasks
filter priority >= 5
derive urgent = priority >= 8
sort {-priority, id}
select {id, title, state, urgent}
take 20
```

Common stages are `filter`, `derive`, `select`, `sort`, `take`, `page`, `group`, and `aggregate`.

## Match ADTs

```text
from tasks
filter match state {
  Running {attempt, ..} => attempt >= 2
  Failed {retryable, ..} => retryable
  _ => false
}
derive label = match state {
  Pending => "pending"
  Running {worker, ..} => worker
  Done {result} => result
  Failed {message, ..} => message
}
```

Match checks types, exhaustiveness, and unreachable branches before scanning. The scrutinee fixes the enum type, so branches may omit `State::`; the qualified form remains available for disambiguation. Patterns recursively destructure sums, options, records, tuples, and lists under explicit budgets.

## Local functions and aggregation

```text
from tasks
let urgent = (priority: int) -> priority >= 8
filter urgent priority
group state {
  aggregate {
    count = count
    max_priority = max priority
  }
}
```

Local functions use arrow closures and are pure, non-recursive, and bounded. A single parameter may use `value -> expression`; multiple parameters use `(left: T, right: U) -> expression`. Paired-pipe closures are not part of the language. Aggregation supports count/sum/min/max, typed empty input, full ADT keys, and bounded groups and working memory.

## Pagination and explain

Bounded lookup places complete typed rows from a target table into a list field on each driver row:

```text
from orders
sort id
page 100
lookup lines from order_lines on order_id == id take 100
select {id, customer, lines}
```

The left key belongs to the target, the right key to the current pipeline, and their static types must match. The target key must be a primary key, secondary index, or first composite-index component. Per-driver `take` is a hard 1..=1000 bound; excess matches return `E_RELATION_LIMIT` instead of truncating. This is not a general SQL join and cannot target a mutation.

Use bounded correlated exists when only match presence is needed:

```text
from tasks
filter exists {
  from task_items
  filter task_id == outer.id
  filter state != Done
}
```

Ordinary inner paths belong to the target table; `outer.id` explicitly reads the current driver row. At least one type-compatible correlation target must lead an index. The first version permits only inner filters, accepts at most 10,000 drivers, and stops at the first match.

```text
from tasks
sort {-priority, id}
page 100
```

Stable pagination needs a unique keyset order ending in the primary key, or a proven unique-index suffix. Opaque HMAC cursors bind database identity, schema, sequence, query, params, and page size; any successful write expires old cursors before scanning.

Continue with `page 100 after "u1.payload.mac"` and move backward with `before`. Limits are 1..=1000; page cannot mix with take, group, aggregate, or mutation targets.

`explain` binds and plans without returning rows. `explain analyze` executes on the same immutable snapshot but returns only value-free timings, examined/decoded counts, index entries, batches, and peak working memory.

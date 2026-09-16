# Complete query and expression reference

## Pipeline order

```text
from tasks
let threshold = 5
let urgent = (priority: int) -> priority >= threshold
filter archived == false
filter urgent priority
derive label = match state {
  Pending => "pending"
  Running {worker, ..} => worker
  Done {result} => result
  Failed {message, ..} => message
}
sort {-priority, id}
select {id, title, state, priority, label}
take 20
```

Stages execute in source order. `filter` changes the row set, `derive` extends the current schema, `select` changes fields visible to later stages, `sort` defines order, and `take`/`page` bounds the result. The planner skips only leading `let` stages and does not reorder work across other stage boundaries.

## Expressions and match

Expressions include field paths, bindings, parameters, typed literals and constructors, checked arithmetic, comparisons, boolean operators, option helpers, `contains`, `length`, bounded `any/all`, and non-recursive local functions.

```text
filter {
  priority >= $minimum
  && contains tags "release"
  && is_some assignee
  && all attempts (x -> x >= 0)
}
```

Parenthesize mixed `&&`/`||`. Arrow closures use `x -> expression` or `(x: Type) -> expression`; paired-pipe closures are excluded because `|` already joins compact pipelines. Integer arithmetic is checked; every float intermediate must remain finite. Overflow, division by zero, NaN, and infinity return `E_ARITH`. A pipeline or DML target evaluates at most 100,000 list-predicate elements.

```text
filter match state {
  Running {attempt, ..} => attempt >= 2
  Failed {retryable: true, ..} => true
  _ => false
}
```

Patterns recursively destructure sums, options, records, tuples, and lists. Before scanning, the binder checks exhaustiveness, unreachable branches, and product-type correlation, with a 100,000-step analysis budget. `_` is catch-all; `..` ignores remaining record fields. `derive x = match source {...}` can construct any target typed value, and mutation `set` reuses the same typed IR.

## Projection, sorting, and take

```text
from tasks
derive {
  subtotal = price + tax
  has_owner = is_some owner
}
sort {-priority, created_at, id}
select {
  id
  display = title
  total = subtotal + shipping
}
take 11..21
```

The equivalent form with an inclusive endpoint is a separate pipeline:

```text
from tasks
derive {
  subtotal = price + tax
  has_owner = is_some owner
}
sort {-priority, created_at, id}
select {
  id
  display = title
  total = subtotal + shipping
}
take 11..=20
```

Use `take 20` when only a row limit is needed.

Projection order is response-column order. Duplicate or unknown fields fail even on an empty table. All typed values have a total order: sums by variant ID then payload, records by field ID, `None < Some`, and lists by prefix-first lexicographic order. Equal sort keys have no stable order; append the primary key when stability matters. Ranges are one-based and follow Rust: `11..21` is half-open and `11..=20` includes the endpoint; both skip ten rows and return at most ten.

## Aggregation

Ungrouped `aggregate` and `group ... { aggregate {...} }` support count, sum, min, and max. On empty input, count is 0, sum is the numeric zero of its input type, and min/max return `Option<T>`. A complete ADT may be a group key; without an explicit sort, group order is unspecified.

Limits are 256 aggregate outputs, 100,000 groups, 1,000,000 accumulator cells, 64 MiB estimated group state, 250,000 working rows, and 100,000 result rows. Exceeding a limit returns `E_LIMIT`.

## Bounded lookup

```text
from orders
filter tenant == $tenant
sort id
page 100
lookup lines from order_lines on order_id == id take 100
select {id, customer, lines}
```

The target key must be a primary key, single-column index, or first component of a composite index, with the same type as the driver key. Per-driver `take` is a hard 1..=1000 bound; seeing `take + 1` returns `E_RELATION_LIMIT`. A lookup accepts at most 10,000 driver rows and returns `[]` for no match. After `page`, only lookup and select are allowed. Lookup is unavailable in mutation targets and does not offer target-side custom sort.

## Bounded correlated exists

```text
from tasks
filter exists {
  from task_items
  filter task_id == outer.id
  filter state != Done
}
```

The inner pipeline permits only filters and requires a type-compatible `target.path == outer.path` equality whose target leads a primary or secondary index. A stage accepts at most 10,000 driver rows and stops the target query at the first residual match. `explain.plan.exists` reports the target table, correlation paths, selected index, and limit without executing rows. The first version excludes not/nested exists, mutation targets, and other inner stages.

## Stable keyset pages

```text
from jobs
filter archived == false
sort {-priority, id}
page 100 after "u1.payload.mac"
```

Page size is 1..=1000 with at most 16 sort keys. The final order must end in the primary key or be provably unique through an equality-fixed prefix and complete unique-index suffix. A cursor is at most 8192 bytes with a 6144-byte payload. Its HMAC binds database identity, schema, canonical query, typed parameters, direction, limit, sequence, and boundary tuple.

Any successful mutation advances sequence and makes an old cursor return `E_CURSOR_STALE`; failed/rolled-back operations, reads, and idempotent replays do not. Restore rotates database and cursor identity.

## Explain and resource budgets

`explain` reports access kind, index lookup, candidate count, source stage order, and result schema without executing rows. `explain analyze` executes the normal read path but returns no business values; it adds stage timings, returned/examined/decoded rows, index entries, redb cache data, batches, and peak working memory.

General bounds are 1 MiB / 100,000 tokens / 64 levels of source, 250,000 working rows, 100,000 result rows, a 16 MiB service response, and a default 25-second service deadline. Use indexed filters, small pages/batches, and early projection instead of depending on defensive maxima.

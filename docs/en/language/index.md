# Language tour

unionid uses a semicolon-free, PRQL-inspired language. A request contains schema work, a mutation, or a query and executes atomically.

```text
from tasks
filter priority >= 5
derive urgent = priority >= 8
select {id, title, state, urgent}
sort {-priority, id}
take 20
```

- [Data model](./data-model): records, sums, tuples, options, lists, defaults, and recursive ADTs.
- [Scalars and expressions](./scalars): production scalars, arithmetic, collection helpers, temporal and decimal rules.
- [Queries](./queries): pipelines, match, derive, aggregation, lookup, pagination, and explain.
- [Mutations](./mutations): insert, upsert, update, delete, batches, returning, and atomicity.

Braces delimit records, field sets, match branches, and multi-key sorts; brackets delimit lists; parentheses express precedence, tuples, and calls. Mixed `and`/`or` expressions use parentheses explicitly. Parameters and complete DML structure are bound before rows are scanned.

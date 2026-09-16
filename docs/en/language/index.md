# Language tour

unionid uses a semicolon-free, PRQL-inspired language. A request contains schema work, a mutation, or a query and executes atomically.

```text
from tasks
filter priority >= 5
derive urgent = priority >= 8
sort {-priority, id}
select {id, title, state, urgent}
take 20
```

- [Data model](./data-model): structs, enums, tuples, `Option<T>`, `List<T>`, defaults, and recursive ADTs.
- [Scalars and expressions](./scalars): production scalars, arithmetic, collection helpers, temporal and decimal rules.
- [Queries](./queries): pipelines, match, derive, aggregation, lookup, pagination, and explain.
- [Mutations](./mutations): insert, upsert, update, delete, batches, returning, and atomicity.

Braces delimit structs, enums, record values, field sets, match branches, groups, and multiline expressions. Brackets delimit lists; parentheses express precedence, tuples, positional payloads, and calls. Newlines separate multiline items without commas; compact inline forms use commas. Boolean operators are `!`, `&&`, and `||`. Local closures use `value -> expression` or `(value: Type) -> expression`; `|` is reserved for compact pipelines. Parameters and complete DML structure are bound before rows are scanned.

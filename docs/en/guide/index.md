# Meet unionid

unionid is a lightweight Rust database with algebraic data types (ADTs) and pipeline queries built directly into its data model. It fits local applications, embedded tools, and services that need explicit data boundaries.

## Two defining ideas

### Describe database data directly with ADTs

Product and sum types, options, lists, tuples, and finite recursive types are part of the schema. The database validates constructors, payloads, defaults, keys, indexes, and migrations, making illegal states harder to persist.

### Query ADTs as ADTs

The PRQL-style pipeline language can exhaustively match variants, destructure nested fields, and construct typed values. Reads, updates, parameter binding, and `returning` share the same type semantics.

## Intended scope

The current product targets one machine, one database owner, and serialized writes. Around 10,000 rows is a comfortable working set; 100,000 rows is a tested upper bound. General flattened joins, windows, and distributed execution are outside the current scope.

Continue with [Getting started](./getting-started).

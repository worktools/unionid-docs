# Generate Unionid queries with an LLM

The Unionid binary bundles a compact language reference and runnable examples matched to its own version. An LLM, editor extension, or generator does not need to scrape the documentation site or guess the active syntax.

## Three context layers

A reliable generation request supplies all three:

1. **Language rules and examples** from `unionid docs query`;
2. **The exact target schema** from `unionid schema print --db <db> --format json`;
3. **The business request**, including filters, projection, order, bounds, and whether mutation is allowed.

The bundled reference contains no business rows, database path, cursor secret, or receipt. `schema print` supplies the tables, fields, ADT variants, keys, and indexes so the model does not invent SQL tables or JSON fields.

```bash
unionid docs query > unionid-query-context.md
unionid docs query --format json > unionid-query-context.json
unionid schema print --db app.redb --format json > schema.json
```

The default output is Markdown with stable front matter and can be placed directly in a prompt. JSON is easier for tools to compose:

```json
{
  "schema_version": 1,
  "software_version": "0.6.0",
  "language_version": "0.7",
  "topic": "query",
  "reference": "# Unionid query language for LLMs\n...",
  "examples": [
    {"name": "adt-query", "description": "...", "source": "enum State { ... }"}
  ]
}
```

Version 1 may add fields but will not change or remove the meaning of existing fields. `software_version` identifies the binary serving the content; `language_version` identifies the source contract.

## Recommended prompt shape

```text
You generate Unionid source, not SQL.

<unionid-reference>
Paste the output of unionid docs query.
</unionid-reference>

<database-schema>
Paste the output of schema print --format json.
</database-schema>

<request>
Select retryable tasks, ordered by descending priority and ascending id, at most 20 rows.
</request>

Return one canonical .unid operation and no prose.
Do not invent tables, fields, variants, or indexes.
```

The reference tells the model that queries are ordered PRQL-style pipelines, ADTs use exhaustive `match`, an expected enum type permits `Pending` while standalone or ambiguous construction uses `State::Pending`, closures use `value -> expression` rather than `|value|`, and source has no semicolons. Aggregation is limited to `count/count_distinct/avg/sum/min/max`. When rows must remain rows while gaining per-group positions, it emits a `window` with an explicit sort and `row_number/rank/dense_rank`, without inventing frames, lag, or lead. For correlated existence, it uses `filter exists { from ... }` or `filter not exists { from ... }`, references the driver as `outer.path`, and selects a target key backed by an index in the supplied schema. The target and outer correlation paths must have compatible types.

## Validate generated source

Treat LLM output as unvalidated source. Save it as `.unid`, then run:

```bash
unionid fmt --file generated-query.unid
unionid query describe \
  --db app.redb \
  --file generated-query.unid \
  --output generated-query.contract.json
```

`fmt` displays the canonical form; use `fmt --check` in CI. `query describe` uses the current parser, binder, and target schema to check fields, parameters, variant payloads, match coverage, result types, and cardinality without executing the query. Execute through `run`, a client, or a prepared API only after validation succeeds.

Mutations need an additional human or application-policy review and should be rehearsed against a read-only environment or database copy. Use a protocol idempotency key when retrying after a lost response; never let a model infer mutation outcome by blindly repeating it.

## Bundled examples

The JSON bundle provides three canonical executable programs:

- `adt-query`: define ADTs, insert an enum, match, derive, sort, and project;
- `nested-values`: nested records, options, enum payloads, lists, and arrow closures;
- `mutation`: simultaneous typed assignments, an ADT state transition, and returning.

Source checkouts and release archives contain the same `.unid` files under `examples/llm/`. Tests execute them and assert formatter idempotence, preventing drift between examples and the language implementation.

```text
from tasks
filter match state {
  Pending => true
  Running {attempt, ..} => attempt < 3
  _ => false
}
sort {-priority, id}
select {id, title, state}
take 20
```

See [Queries](../language/queries) and the [complete query reference](../reference/query-reference) for full stage and expression semantics.

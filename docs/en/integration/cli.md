# CLI and REPL

```bash
unionid run --db app.redb --file query.unid
unionid run --db app.redb 'from tasks | take 10'
unionid run --db app.redb --read-only --file report.unid
```

Read-only mode parses and binds fully, then rejects mutation before candidate state or a durable transaction. It is an execution boundary, not a replacement for file permissions.

## Local and TCP REPL

```bash
unionid cli --db app.redb
unionid server --db app.redb --addr 127.0.0.1:7878
unionid cli --addr 127.0.0.1:7878
```

The REPL uses parser-driven complete/incomplete/invalid states, so a blank line cannot accidentally submit an unfinished block. It supports catalog-aware completion and configurable, disableable persistent history.

`.tables`, `.types`, `.schema`, and `.storage` expose shared introspection across memory, redb, and TCP.

## Project and generated bindings

```bash
unionid init app
unionid project check --dir app
unionid schema check --file app/schema.unid
unionid schema print --db app/data/app.redb
unionid query rust --schema app/schema.unid \
  --dir app/queries --output app/generated/queries.rs
```

Generated code contains shared ADTs, typed parameters, result rows, call functions, and query digests. Regenerate and recompile after schema or query changes.

`schema rust` generates serde structs/enums from a declaration or live database. `schema describe` emits a value-free portable ADT contract. `query describe` binds one static query offline and records parameters, result shape, cardinality, canonical source, and digest:

```bash
unionid schema describe --db app.redb --output schema.contract.json
unionid query describe --schema schema.unid \
  --file queries/find_task.unid --output generated/find_task.json
```

## LLM query documentation

`unionid docs query` prints a prompt-ready query reference and runnable examples from the current binary. `--format json` separates the reference and examples. Supply the exact `schema print --format json` output for real generation and validate with `query describe`; see [LLM query generation](./llm).

```bash
unionid docs query
unionid docs query --format json
```

Machine-facing commands support `--format json`. Automation should branch on structured error codes and exit classes rather than prose.

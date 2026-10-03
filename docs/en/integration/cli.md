# CLI and REPL

```bash
unionid run --db app.redb --file query.unid
unionid run --db app.redb -q 'from tasks | take 10'
unionid run --db app.redb --read-only --file report.unid
```

Use `-q/--query` for inline scripts and `-f/--file` for files. Read-only mode parses and binds fully, then rejects mutation before candidate state or a durable transaction. It is an execution boundary, not a replacement for file permissions.

## Inspect local Parquet

`unionid parquet` reads one local Parquet file and shows its inferred structural types, file metadata, and first 20 rows without importing it into redb:

```bash
unionid parquet events.parquet
unionid parquet events.parquet --limit 0
unionid parquet people.parquet --query 'from data | filter active | select {id, name} | sort id'
unionid parquet people.parquet --interactive
```

The file becomes the read-only table `data` for the existing typed pipeline (filter, select, derive, group/aggregate, sort), and `explain` shows the Parquet scan and column projection. Scans use bounded batches with projection pushdown; nullable columns map to `Option<T>` and named enums are never inferred. Only single local files are supported: no remote storage, globs, stable page cursors, or export, and nothing is exposed over TCP/HTTP. Previews show at most 1,000 rows.

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

Generated code contains shared ADTs, typed parameters, result rows, call functions, and query digests. Regenerate and recompile after schema or query changes. Generated source passes through the canonical formatter, so regeneration is stable.

## Formatting

```bash
unionid fmt schema.unid                       # one file, printed to stdout
unionid fmt --check schema.unid queries/*.unid
unionid fmt --write schema.unid queries/*.unid
```

`fmt` accepts many files. `--check` exits nonzero when any file is not canonical; `--write` validates the whole batch before rewriting anything. Never reformat migrations that have already been applied—their checksums are immutable.

`schema rust` generates serde structs/enums from a declaration or live database. `schema describe` emits a value-free portable ADT contract. `query describe` binds one static query offline and records parameters, result shape, cardinality, canonical source, and digest:

```bash
unionid schema describe --db app.redb --output schema.contract.json
unionid query describe --schema schema.unid \
  --file queries/find_task.unid --output generated/find_task.json
```

## Bundled documentation

The installed binary ships version-matched user documentation that works offline:

```bash
unionid docs
unionid docs list --category language
unionid docs show query
unionid docs show migrations --format json
```

Topics are grouped into `learn`, `language`, `application`, `lifecycle`, `integration`, and `operations`. `show` prints complete Markdown with version front matter; `--format json` returns a version-1 object.

## Agent capability manifest

`unionid agent --format json` prints a version-1 manifest: commands and usage, protocol/stream/storage versions, error-contract fields (`code`/`message`/`span`/`constraint`/`hint`), the full error-code vocabulary, constraint classes and hints, exit classes, and the recommended read-schema → generate → validate → execute workflow. Without `--format` it prints Markdown. It is read-only, offline, and never opens a database, so agents, editor plugins, and CI can discover the surface first.

## LLM query documentation

`unionid docs query` prints a prompt-ready query reference and runnable examples from the current binary. `--format json` separates the reference and examples. Supply the exact `schema print --format json` output for real generation and validate with `query describe`; see [LLM query generation](./llm).

```bash
unionid docs query
unionid docs query --format json
```

Machine-facing commands support `--format json`. Automation should branch on structured error codes and exit classes rather than prose.

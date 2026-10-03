# Complete CLI reference

This page documents behavior that automation may rely on. Replace `app.redb`, `schema.unid`, and `migrations/` with your own paths.

## Global conventions

- Text output is for humans; scripts should select `--format json` where available.
- Query JSON remains `QueryResponse` compatible. Non-query commands use one redacted error envelope.
- redb commands obey the single-writer rule; ownership conflicts return `E_BUSY`.
- Maintenance never silently repairs, upgrades, or deletes data. Destructive effects require explicit confirmation.

## Run, client, and server

```bash
unionid run --db app.redb --file app.unid
unionid run --db app.redb -q 'from tasks | take 10'
unionid cli --db app.redb
unionid server --db app.redb --addr 127.0.0.1:7419
unionid cli --addr 127.0.0.1:7419
```

`run` executes one atomic script from `--file` or `-q/--query`; without `--db` it runs against a fresh memory database. `cli` without a file enters the REPL; local mode opens redb directly and remote mode uses the versioned request protocol. With `--read-only`, parsing and binding still occur but a mutation returns `E_READ_ONLY` before candidate state or a persistent transaction is created.

REPL `.tables`, `.types`, `.schema`, and `.storage` use shared introspection across memory, redb, and TCP modes. Blank lines and EOF never submit an incomplete parser state.

## Local Parquet

```bash
unionid parquet events.parquet
unionid parquet events.parquet --limit 0 --format json
unionid parquet people.parquet --query 'from data | filter active | select {id, name}'
unionid parquet people.parquet --interactive
```

Opens one local file read-only and never creates a database. It shows the schema, row count, row groups, and the first 20 rows (`--limit` up to 1,000); `--query` and `--interactive` run typed pipelines against the request-local read-only table `data`. Scans use source batches of at most 1,024 rows and 16 MiB with top-level column projection; oversized single rows are rejected.

## Bundled docs and agent manifest

```bash
unionid docs
unionid docs list --category language --format json
unionid docs show query
unionid docs query --format json
unionid agent --format json
```

`docs` prints offline documentation matched to the binary; `agent` prints a version-1 capability manifest with command usage, the error-code vocabulary, constraint hints, and exit classes. Neither touches the network or opens a database.

## Project scaffold and whole-project validation

```bash
unionid init tasks
unionid project check --dir tasks
```

Init writes only to an explicit missing or empty destination, performs no parent-directory discovery, and creates no database. It validates the bundled schema, initial migration, seed, and typed query before publishing files. Project check validates `schema.unid`, `migrations/`, and `queries/` in that order, proves that history reaches the declarative schema, and binds every query against it without executing seed or opening a database. Bounds are 256 source files, 512 directory entries, 16 query-directory levels, 1 MiB per file, and 8 MiB total project source.

## Formatting and schema tools

```bash
unionid fmt --file app.unid
unionid fmt --check schema.unid queries/a.unid queries/b.unid
unionid fmt --write schema.unid queries/a.unid queries/b.unid
unionid schema check --file schema.unid
unionid schema print --db app.redb
unionid schema rust --file schema.unid --output src/schema.rs
unionid schema describe --file schema.unid --format json
unionid schema describe --db app.redb --format json
```

`fmt` takes positional files or repeated `--file`. One file without flags prints to stdout; `--check` exits nonzero if any file differs; `--write` validates the whole batch before rewriting. Never rewrite applied migrations, whose checksums are immutable. `fmt --check` belongs in CI. It proves canonical, idempotent formatting, not that schema can be applied to a particular database. `schema describe` emits portable-contract version 1: schema identity, stable IDs, recursion, exact scalar constraints, defaults, tables, keys, and indexes, but no rows, database identity, cursor secret, or business value. Database describe reads a private byte-for-byte copy so inspection cannot modify the requested file.

## Static query contracts and generation

```bash
unionid query describe --schema schema.unid --file queries/find_task.unid --format json
unionid query rust --schema schema.unid --file queries/find_task.unid \
  --name find_task --output src/find_task.rs
unionid query rust --schema schema.unid --dir queries --output src/queries.rs
```

Each query file contains one prepared operation. Describe uses the production parser, binder, and type IR and reports parameters, result columns, cardinality, mutation/affected-row behavior, and required schema identity. Generated Rust contains schema ADTs, `Params`, result rows, and Engine calls returning `T`, `Option<T>`, or `Vec<T>` according to cardinality. It checks revision/hash before prepare and returns `E_SCHEMA_CHANGED` on drift. Directory mode generates shared ADTs once and fails atomically on any query or naming error.

## Migration and storage maintenance

```bash
unionid migration status --db app.redb --dir migrations
unionid migration plan --db app.redb --dir migrations --queries queries
unionid migration apply --db app.redb --dir migrations --queries queries
unionid migration advance --db app.redb --dir migrations --max-steps 100
unionid migration abort --db app.redb
unionid migration rehearse --db app.redb --dir migrations --queries queries --copy rehearsal.redb

unionid check --db app.redb
unionid upgrade --db app.redb --target 4
unionid compact --db app.redb
unionid doctor --db app.redb --format json
unionid version --format json
```

Plan is read-only; apply attempts completion; advance bounds shadow work (format 6 and later) by committed maintenance actions. Abort applies only to a reversible building state, never to a schema after cutover. Rehearse works on a private copy; `--copy` keeps it at a path that must not exist yet. `--queries <dir>` binds saved queries against the target schema; any invalid query fails with `E_MIGRATION` (exit 3) and `apply` commits nothing.

Check combines redb and unionid logical verification. Upgrade is explicit, synchronous, two-phase authorization. Compact is offline: verify backup, exclude every process/snapshot/unfinished maintenance, and reserve time, memory, and disk. After interruption or `E_STORAGE_REOPEN_REQUIRED`, reopen and run check. Doctor only inspects a private temporary copy; it never repairs, creates, or upgrades the requested database.

## Receipts and incremental backup

```bash
unionid receipts status --db app.redb --format json
unionid receipts prune --db app.redb --through-sequence 12000 --max-receipts 500
unionid receipts prune --db app.redb --through-sequence 12000 --max-receipts 500 --confirm
unionid receipts retain --db app.redb --min-age-seconds 86400 --max-receipts 1000
unionid receipts retain --db app.redb --min-age-seconds 86400 --max-receipts 1000 --confirm

unionid backup incremental init --db app.redb --repo backup-repo
unionid backup incremental export --db app.redb --repo backup-repo
unionid backup incremental verify --repo backup-repo
unionid restore incremental --repo backup-repo --db restored.redb
```

Receipt prune and retain preview by default and delete atomically only with `--confirm`. Retain selects receipts older than a UTC age window, at most 1,000 per pass; `server --receipt-retention-seconds` runs the same cleanup on a schedule and is off by default. Receipts are durable exactly-once state, not a disposable cache. Incremental init authorizes journal enablement and entering the journal format (6 → 7, 8 → 9, 10 → 11). Export publishes only complete consecutive commits. Restore requires a new path and establishes new database/cursor identity.

## Stable exit codes

| Code | Category | Automation response |
| --- | --- | --- |
| `0` | success | continue |
| `1` | unclassified | retain envelope; inspect |
| `2` | arguments/configuration | fix invocation; do not retry |
| `3` | input/schema/migration | fix contract; do not retry |
| `4` | connection or `E_BUSY` | bounded backoff |
| `5` | storage or uncertain result | stop writes; reopen and check |
| `6` | integrity failure | isolate and restore/investigate |

Recovery must use exit code, structured error code, and certainty semantics together; do not scrape human stderr alone.

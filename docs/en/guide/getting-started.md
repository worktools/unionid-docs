# Getting started in five minutes

This journey starts with an installed `unionid` binary and an empty directory. It ends with a reopenable redb database, repeatable migrations, a typed query, and a verified backup.

## 1. Install and inspect

Rust 1.94 or newer is required:

```bash
cargo install unionid --locked
unionid version --format json
unionid doctor --format json
```

You may instead use a release archive or run `cargo build --locked` from source. The remaining commands are identical. These diagnostics do not create a database.

## 2. Generate a project

```bash
mkdir unionid-first-use
cd unionid-first-use
unionid init tasks
cd tasks
unionid project check --dir .
```

`init` accepts only a missing or empty destination. It creates `schema.unid`, an initial migration, seed data, a typed query, and an ignored `data/` directory. `project check` validates canonical formatting, the migration target schema, and query binding without creating a database.

## 3. Create, write, and query

```bash
unionid migration apply --db data/tasks.redb --dir migrations
unionid run --db data/tasks.redb --file seed.unid
unionid run --db data/tasks.redb --file queries/list_running.unid
```

The final command reopens the database in a fresh process and returns the seeded `Running` task. Results preserve the complete variant and record payload; fields, constructors, payloads, and match coverage are checked before scanning.

## 4. Diagnose and check

```bash
unionid doctor --db data/tasks.redb --format json
unionid check --db data/tasks.redb
```

`doctor` examines a permission-restricted temporary copy without changing the requested path. `check` validates the original redb file, catalog, schema hash, typed rows, RowIds, indexes, and migration ledger.

## 5. Back up and restore

```bash
unionid backup --db data/tasks.redb \
  --output data/tasks.backup.json --format json
unionid restore --backup data/tasks.backup.json \
  --db data/restored.redb --format json
unionid run --db data/restored.redb \
  --file queries/list_running.unid
unionid check --db data/restored.redb
```

Restore only writes a new destination. The restored schema identity, typed rows, and query result should match the source.

Next, read [Project layout](./project-layout), [Queries](/en/language/queries), or [Rust integration](/en/integration/rust).

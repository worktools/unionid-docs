# Getting started

You need Rust 1.94 or newer. Once installed, unionid can complete its first-use flow in any empty directory without a source checkout.

## Install

```bash
cargo install unionid --locked
```

Inspect the selected binary and its compatibility range:

```bash
unionid version --format json
unionid doctor --format json
```

Neither command creates a database.

## Create a project

```bash
unionid init tasks
cd tasks
unionid project check --dir .
```

The generated project contains an ADT schema, an initial migration, seed data, and a typed query. `project check` validates schema, migrations, and queries in order without creating a database.

## Create and query the database

```bash
unionid migration apply --db data/tasks.redb --dir migrations
unionid run --db data/tasks.redb --file seed.unid
unionid run --db data/tasks.redb --file queries/list_running.unid
```

The final command reopens redb in a new process and returns the seeded `Running` task.

## Check the database

```bash
unionid doctor --db data/tasks.redb --format json
unionid check --db data/tasks.redb
```

`doctor` diagnoses a private temporary copy. `check` verifies the original database, catalog, typed rows, indexes, and migration ledger.

Continue with the [language overview](/en/reference/).

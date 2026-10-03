# Schema migrations

Each migration has an immutable ID, optional parent, content checksum, and resulting schema identity. The ledger is a single chain; editing applied content or forking a parent is rejected.

```text
migration task_state_v2 {
  parent task_state_v1
  rename variant State::Failed to Rejected
  change variant State::Rejected to {code: int, message: text} using old -> {code: 0, message: old.message}
}
```

Rename preserves stable identity. Drop and recreate does not. Type changes, payload changes, and destructive drops require explicit conversions.

```bash
unionid schema check --file schema.unid
unionid migration diff --db app.redb \
  --schema schema.unid --name task_state_v2
unionid migration plan --db app.redb --dir migrations
```

Diff directly generates deterministic adds, defaults, keys, and indexes. It also emits destructively marked drops for removed types, tables, fields, variants, and indexes. A data-bearing drop explicitly discards existing data and is not “safe”; review its impact before plan/apply. Suspected renames, required backfills, type or payload conversions, and reorderings become invalid `todo` entries until replaced with an explicit rename, `using old -> ...` conversion, or other intended operation.

## Preflight saved queries

A schema change can break saved queries that would otherwise fail only at runtime. `--queries` makes plan, rehearse, and apply bind a query directory statically against the target schema, without executing queries or needing parameter values:

```bash
unionid migration plan --db app.redb --dir migrations --queries queries --format json
unionid migration rehearse --db app.redb --dir migrations --queries queries --format json
unionid migration apply --db app.redb --dir migrations --queries queries --format json
```

`queries/` must exist and be nonempty; `.unid` files are loaded recursively, each holding one statically describable query or DML (optionally followed by `expect`). Queries are checked even when no migration is pending. If any query is invalid on the final schema, the command returns `E_MIGRATION` (exit 3) with per-file failures in `query_validation.files[].failures`; `apply` fails before its first commit and never creates a new database file. A valid preflight does not guarantee data conversion succeeds—later migration files can still fail after earlier ones committed—so use `query_validation.valid` to tell the two failures apart.

`plan` and `rehearse` run on a locked temporary copy and leave the source bytes unchanged; `rehearse --copy <path>` keeps the rehearsal copy. Preflight covers only the directory you pass and never discovers client code, and generated Rust bindings still pin the exact schema hash, so regenerate them before deploying. Rust callers use `Engine::plan_migrations_with_queries` and `apply_migrations_with_queries`.

## Apply and recover

Back up, apply (with `--queries queries`), check, and inspect status. Databases at format 6 and later build a checkpointed shadow generation, validates it, then atomically cuts over. Reads stay on the old generation while ordinary writes are blocked. Resume interruption with the identical files or bounded `migration advance --max-steps`; abort only an uncut target. There is no implicit down migration—restore a backup or write a forward migration.

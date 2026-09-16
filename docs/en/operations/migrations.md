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

Back up, apply, check, and inspect status. Format 6 builds a checkpointed shadow generation, validates it, then atomically cuts over. Reads stay on the old generation while ordinary writes are blocked. Resume interruption with the identical files or bounded `migration advance --max-steps`; abort only an uncut target. There is no implicit down migration—restore a backup or write a forward migration.

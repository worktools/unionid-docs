# Project layout and development loop

`unionid init <name>` creates a standalone database project. Commit schemas, migrations, and queries with application source. Treat redb files and backups as controlled runtime data.

```text
tasks/
├── schema.unid
├── migrations/0001_initial.unid
├── queries/list_running.unid
├── seed.unid
└── data/                 # normally ignored
```

## Normal change sequence

1. Edit `schema.unid` to describe the target structure.
2. Generate a migration draft with `migration diff`.
3. Replace every rename or conversion `todo` with explicit operations.
4. Run project check, migration plan, and application queries.
5. Back up and rehearse on a copy before the production window.

```bash
unionid schema check --file schema.unid
unionid migration diff --db data/tasks.redb \
  --schema schema.unid --name add_priority
unionid project check --dir .
unionid migration plan --db data/tasks.redb --dir migrations
```

`.unid` is canonical. `.uid` remains readable during the pre-1.0 compatibility window but prints a deprecation. Migration checksums cover content, not paths, so renaming the extension does not reapply history.

`schema.unid` is editable desired state. Migration files are immutable execution history. The database catalog stores stable IDs, revision, hash, and the ledger. Reading a schema never migrates a database implicitly, and upgrading a binary never changes the application schema automatically.

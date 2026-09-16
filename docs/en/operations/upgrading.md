# Upgrading unionid

Binary version, storage format, component codecs, protocol, and application schema evolve independently. A binary upgrade never applies schema migrations automatically.

Before upgrading, retain the old `version --format json` and `doctor --db ... --format json`, run check, create and restore-test a logical backup, and keep the old binary and checksum. Exercise the new binary on a quiescent copy with doctor, check, migration planning, and application operations.

Open production only when the release contract declares the stored format readable. Format changes are explicit and stepwise:

```bash
cp app.redb rehearsal.redb
unionid doctor --db rehearsal.redb --format json
unionid upgrade --db rehearsal.redb --target 4
unionid upgrade --db rehearsal.redb --target 5
unionid upgrade --db rehearsal.redb --target 6
unionid check --db rehearsal.redb
```

There is no in-place downgrade. Restore the pre-upgrade logical backup into a new path supported by the old binary.

`.unid` is canonical; `.uid` remains compatible until 1.0. Checksums do not include paths, so extension renames preserve ledger history. Dry-run bulk renames, update scripts, then confirm migration status is unchanged.

Regenerate static Rust query bindings and digests after relevant binary, schema, or query changes. Protocol v1 covers foundational values; production scalars require v2.

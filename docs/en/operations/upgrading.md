# Upgrading unionid

Binary version, storage format, component codecs, protocol, and application schema evolve independently. A binary upgrade never applies schema migrations automatically.

Before upgrading, retain the old `version --format json` and `doctor --db ... --format json`, run check, create and restore-test a logical backup, and keep the old binary and checksum. Exercise the new binary on a quiescent copy with doctor, check, migration planning, and application operations.

## Highlights since v0.8

| Version | User-visible change | Upgrade action |
| --- | --- | --- |
| v0.9 | `unionid-query` and the inline `queries!` macro | use one exact version for all three crates |
| v0.10 | typed maps, decimal multiply/divide with explicit rounding, partial unique indexes; fresh databases default to storage format 10 | older format 6/7 databases need `upgrade --target 8/10` (or 9/11) before declaring maps or partial unique indexes; code that builds `Error {..}` directly adds `constraint: None` |
| v0.11 | read-only `unionid parquet`; `project check` compares declared structure | no format upgrade |
| v0.12 | `expect affected` business guards and per-statement `statements` summaries | code that builds `Error` directly adds `statement_index`; guarded scripts are unsupported in legacy WAL mode |
| v0.13 | migration `--queries` preflight, receipt retention, batch `fmt --write`, canonical generated source | no format upgrade; never reformat applied migrations; handwritten status/metrics struct literals need the new fields |
| v0.13.1 / v0.13.2 | fixes for migration replay with incremental backups and current-directory incremental restore | compatible patches, no extra upgrade |

v0.13.2 creates storage format 10 by default and reads 1–11; logical backup is format 6 (reads 1–6); protocols are 1/2 and stream 1. None of these changed after v0.10.

## Explicit format upgrades

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

For the v0.7 source-language migration, run the new `unionid fmt` on a branch and review the resulting structs, enums, colon fields, context-shortened and qualified constructors, and boolean operators. Closures remain `value -> expression`. `take start..end` is now half-open, so manually change it to `take start..=end` where the old inclusive result must be preserved. Then run `project check` and regenerate static Rust query bindings and digests.

Regenerate static Rust query bindings and digests after relevant binary, schema, or query changes. With the `queries!` macro, move `unionid` and `unionid-query` to the same exact version together. Protocol v1 covers foundational values; production scalars require v2.

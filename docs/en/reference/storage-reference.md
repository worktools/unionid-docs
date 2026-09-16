# Complete storage, migration, and recovery reference

This page defines the durable contract operators can depend on. Internal redb table/page layout is not public API; schema identity, stable RowId behavior, the migration ledger, backup archive, and failure certainty are.

## Durable state

The redb backend commits catalog, rows, secondary indexes, migration ledger, receipts, and durable head synchronously. Ordinary DML derives stable-key deltas from the write set. DDL, migration, upgrade, restore, and receipt pruning take explicit rebuild or maintenance paths.

RowId is a table-local monotonically increasing `u64`. Deletion gaps are valid and IDs are never reused. It is not a business key and is not guaranteed contiguous. Integrity verification cross-checks typed rows, primary/secondary indexes, allocators, schema identity, ledger, and receipts.

## Open and failure certainty

Only one writer may own a database; a competing writer gets `E_BUSY`.

| Point of failure | Meaning | Required action |
| --- | --- | --- |
| before durable commit | definitely not committed | bounded retry is allowed |
| commit succeeds and returns | definitely committed | acknowledge |
| commit call returns an error | outcome uncertain | stop writes, close, reopen, check |
| integrity verification fails | durable state untrusted | isolate; restore/investigate |

Never infer a commit from file size or whether a client received a response. Idempotency receipts are the safe answer to “commit succeeded, response was lost.”

## Independent versions

Software version, protocol version, storage format, individual codec versions, and schema revision/hash are independent. Opening an old database does not promise an implicit durable upgrade; `upgrade --target N` is explicit authorization. Record `version --format json`, `.storage`, and check results around every upgrade.

## Migration ledger and shadow state

Immutable checksums form a single migration chain. Never rewrite, reorder, or reuse an applied file; append a new migration. Each atomic schema change creates a revision and SHA-256 identity. Stable type/field/variant/table/index IDs survive rename within one lineage.

Safe rollout is: verify a restorable backup, inspect status, plan/rehearse, establish a write maintenance window, apply or bounded-advance, reopen/check, then run application smoke tests.

Format-6 large migrations build a shadow generation. `Building` reads the old generation and blocks ordinary writes. `Ready` cuts over atomically; `Reclaimable` only has old logical keys left to delete. Each advance action is durably committed, so restart resumes from maintenance state. Abort applies only to a reversible build, not after cutover. The logical shadow cap is 1 GiB and one delay is at most 60 seconds.

Generation reclaim does not guarantee a smaller redb file. Physical page reclamation requires offline compact.

## Backup and restore

A full logical backup must be restored to an independent path and verified. Restore never overwrites an active database and creates new database/cursor identity, so old cursors are invalid.

Incremental archive codec 1 consists of a verified baseline, manifest, consecutive immutable segments, and source journal. Init publishes a prepared manifest only after writing and rereading the baseline, then synchronously enables journal and activates the manifest; this explicitly authorizes format 6 → 7. Export publishes a segment, atomically advances the manifest, then trims journal. Defaults are 1000 commits or 64 MiB per segment. Verify reports checksum/sequence gaps and orphan files.

Incremental restore requires a nonexistent destination and may select a sequence cutoff. It rejects gaps, checksum mismatch, and wrong lineage. Run full check and application-level row sampling afterward.

## Offline compact

Before compact, verify backup, stop every process, ensure there is no unfinished maintenance, and reserve time, memory, and space for page movement and multiple syncs. Compact traverses the complete database and is not a cheap health probe. Native work cannot promise transaction-level cancellation after internal commits begin.

The tool reopens after native compact and before post-check so redb region repair is included. `changed` means the durable file truly shrank; a repeated no-op still traverses all data. After interruption, I/O failure, post-check failure, or view rebuild failure, reopen and run full check.

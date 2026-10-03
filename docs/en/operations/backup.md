# Backup, restore, and compaction

```bash
unionid backup --db app.redb \
  --output app.backup.json --format json
unionid restore --backup app.backup.json \
  --db restored.redb --format json
unionid check --db restored.redb
```

Logical backup preserves schema, ledger, typed rows, index identities, and receipts. Restore only creates a new path and rotates database/cursor identity, so source cursors never work against the copy. A backup is not proven until an isolated restore, application query, and check succeed.

Incremental journaling is explicitly enabled and enters the matching journal format: 6 → 7, 8 → 9, or 10 → 11 (fresh databases default to format 10). Keep a full logical backup first. Segments form a checked sequence with parents and database identity; never skip segments or splice chains. Journal formats have no in-place downgrade, and disabling journaling does not turn format 11 back into 10.

Idempotency receipts have no automatic TTL/LRU. Deleting a receipt makes its key executable again, so clean up only after every client and queue has left the retry window.

```bash
unionid receipts status --db app.redb
unionid receipts retain --db app.redb --min-age-seconds 86400 --max-receipts 1000 --format json
# After reviewing the preview and your retry window:
unionid receipts retain --db app.redb --min-age-seconds 86400 --max-receipts 1000 --confirm --format json
```

`receipts retain` selects receipts whose UTC completion time is older than `now - window`, previews on a temporary copy by default, and handles at most 1,000 receipts per pass. `--confirm` resamples time and selection under real writer ownership, so an earlier preview is not an approval token. Use `receipts prune` to preview and confirm an exact time/sequence cutoff instead.

A server can also run scheduled retention, which is off by default:

```bash
unionid server --db app.redb \
  --receipt-retention-seconds 86400 \
  --receipt-retention-interval-seconds 60 \
  --receipt-retention-max-receipts 1000
```

Setting the interval or cap without a window is a configuration error, and read-only or legacy WAL modes reject retention. The worker shares the write lock, skips a pass when the writer is busy, pauses during unfinished migration maintenance, and deletes nothing after observing UTC moving backward. The policy is never persisted in the database or backups; configure it again after restart. Rust/HTTP embedders can start the same worker with `ConcurrentEngine::start_receipt_retention(schedule, shutdown)`.

Generation reclamation may not shrink the redb file. To recover physical high-water space, stop the server, finish maintenance, verify a backup, run `unionid compact --db app.redb`, then check. Compaction preserves storage format, schema, sequence, ledger, RowIds, receipts, and cursor identity. It is not a backup; interrupt or uncertain failure requires reopen and check.

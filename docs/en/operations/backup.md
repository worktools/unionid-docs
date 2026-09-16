# Backup, restore, and compaction

```bash
unionid backup --db app.redb \
  --output app.backup.json --format json
unionid restore --backup app.backup.json \
  --db restored.redb --format json
unionid check --db restored.redb
```

Logical backup preserves schema, ledger, typed rows, index identities, and receipts. Restore only creates a new path and rotates database/cursor identity, so source cursors never work against the copy. A backup is not proven until an isolated restore, application query, and check succeed.

Incremental journaling is explicitly enabled and upgrades storage format 6 to 7. Keep a full logical backup first. Segments form a checked sequence with parents and database identity; never skip segments or splice chains. Format 7 has no in-place downgrade.

Idempotency receipts have no automatic TTL/LRU. Preview a time/sequence cutoff and explicitly confirm prune only after every client and queue has left the retry window.

Generation reclamation may not shrink the redb file. To recover physical high-water space, stop the server, finish maintenance, verify a backup, run `unionid compact --db app.redb`, then check. Compaction preserves storage format, schema, sequence, ledger, RowIds, receipts, and cursor identity. It is not a backup; interrupt or uncertain failure requires reopen and check.

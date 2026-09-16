# Production operations

Production operation spans application schema, database files, internal storage formats, backup chains, and service boundaries. These are independent; a binary upgrade, schema migration, and backup restore are not the same action.

Read in order:

1. [Storage and failures](./storage)
2. [Schema migrations](./migrations)
3. [Backup, restore, and compaction](./backup)
4. [Service deployment](./deployment)
5. [Metrics and diagnosis](./observability)
6. [Upgrading](./upgrading)

Rehearse material changes against a quiescent copy and verify schema identity, ledger, typed rows, indexes, application reads/writes, reopen, and `check`.

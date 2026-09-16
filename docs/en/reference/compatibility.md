# Versions and compatibility

| Version | Scope |
| --- | --- |
| unionid binary | commands, language, implementation |
| storage/component codec | redb internal representation |
| protocol | request/response and wire values |
| schema revision/hash | one database's application structure |

Never infer one from another. Read the binary contract with `unionid version --format json`; inspect the actual database with the REPL `.storage` command or `unionid doctor --db <db> --format json`.

Schema revision is a monotonic invalidation marker within one database. Schema hash is a SHA-256 manifest ordered by stable IDs. Identical source created independently does not imply a shared catalog lineage.

Adding a defaulted field is usually data-safe; adding a sum variant invalidates old exhaustive matches; rename preserves identity but breaks old source names; type changes, drops, and tighter constraints require explicit conversion and full preflight.

Protocol v1 supports foundational scalars and ADTs; v2 adds production scalars. Stream protocol is versioned independently.

The binary only reads storage formats named in its release contract. Enabling incremental backup explicitly enters format 7, which older binaries reject. Logical backup/restore is the preferred cross-format and rollback boundary.

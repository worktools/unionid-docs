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

Rust-shaped source syntax is a v0.7 breaking change. Canonical forms use `struct`/`enum`, `name: Type`, `Option<T>`/`List<T>`, context-shortened `Variant` or fully qualified `Type::Variant`, `field: value`, and `!`/`&&`/`||`. Closures remain `value -> expression`, never `|value|`. The parser temporarily accepts legacy forms for durable recovery and existing scripts, while the formatter emits only the new form.

`take start..end` is now half-open; use `take start..=end` to include the endpoint. Review ranges manually, run the matching `unionid fmt` for other source migration, and regenerate binding digests.

Protocol v1 supports foundational scalars and ADTs; v2 adds production scalars. Stream protocol is versioned independently.

The binary only reads storage formats named in its release contract. v0.13.2 reads storage formats 1–11 and creates format 10 by default; logical backup is format 6 (reads 1–6); protocols are 1/2 and stream 1. Enabling incremental backup explicitly enters the matching journal format (6 → 7, 8 → 9, 10 → 11), which older binaries reject.

`unionid`, `unionid-derive`, and `unionid-query` release together; depend on one exact version such as `=0.13.2` and never mix them. Logical backup/restore is the preferred cross-format and rollback boundary.

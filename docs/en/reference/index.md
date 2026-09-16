# Reference and boundaries

- [Command quick reference](./commands)
- [Errors, limits, and budgets](./limits)
- [Versions and compatibility](./compatibility)

When behavior is uncertain, prefer the installed `unionid <command> --help`, `version --format json`, and that release's contract. This site documents implemented mainline behavior, not future RFC targets.

## Complete manuals

Quick-reference pages confirm common flags. Use these manuals to implement clients, review schemas, and write production runbooks with explicit syntax, failure semantics, and budgets:

- [Complete language reference](./language-reference): lexical rules, types, values, keys, indexes, recursion, and atomic scripts.
- [Complete query reference](./query-reference): stage order, match, aggregation, lookup, paging, and explain.
- [Complete protocol reference](./protocol-reference): envelopes, typed wire values, idempotency, paging, and stream frames.
- [Complete CLI reference](./cli-reference): project checks, generation, maintenance, JSON, and stable exit codes.
- [Complete Rust API reference](./rust-reference): Engine, prepared serde, concurrency, pages, and recovery boundaries.
- [Complete storage reference](./storage-reference): commit certainty, ledger, shadow generations, backup, and compaction.
- [Complete service reference](./service-reference): trust boundary, fixed limits, backpressure, shutdown, metrics, and observers.

These are user-oriented consolidations, not replacements for the machine-readable release contract. During upgrades, compare the docs, `version --format json`, and the target database's `doctor`/`check` results.

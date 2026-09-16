# Application integration

Every entry point reaches the same `Engine` semantics. Choose by process boundary, serialization cost, deployment ownership, and whether Rust typed conversion matters.

| Entry point | Strength | Responsibility |
| --- | --- | --- |
| CLI / REPL | fastest learning and operations | files and exit classes |
| LLM / generator | version-matched rules, schema, and static binding | validate source and review mutations |
| Rust Engine | no network, typed serde, lowest overhead | application owns lifecycle |
| TCP JSON Line | simple process boundary | connections, deadline, TLS gateway |
| HTTP adapter | natural auth and async integration | route authorization and identity |

Start with the [CLI](./cli), use [LLM query context](./llm) when generating source, then choose the [Rust API](./rust) or [protocols](./protocols) for application integration.

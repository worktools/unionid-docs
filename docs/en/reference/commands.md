# Command quick reference

| Goal | Command |
| --- | --- |
| Initialize | `unionid init <dir>` |
| Check project | `unionid project check --dir <dir>` |
| Run a file | `unionid run --db <db> --file <file>` |
| Run inline source | `unionid run --db <db> -q '<script>'` |
| Inspect Parquet | `unionid parquet <file.parquet> [--query '<pipeline>']` |
| Local REPL | `unionid cli --db <db>` |
| Start server | `unionid server --db <db> --addr 127.0.0.1:7878` |
| Connect client | `unionid cli --addr 127.0.0.1:7878` |
| Format check | `unionid fmt --check <files...>` |
| Batch format | `unionid fmt --write <files...>` |
| Bundled docs | `unionid docs` / `unionid docs show <topic>` |
| Agent manifest | `unionid agent --format json` |
| LLM query context | `unionid docs query --format json` |
| Check schema | `unionid schema check --file schema.unid` |
| Print schema | `unionid schema print --db <db>` |
| Draft migration | `unionid migration diff --db <db> --schema schema.unid --name <name>` |
| Plan migration | `unionid migration plan --db <db> --dir migrations --queries queries` |
| Rehearse migration | `unionid migration rehearse --db <db> --dir migrations --queries queries` |
| Apply migration | `unionid migration apply --db <db> --dir migrations --queries queries` |
| Integrity check | `unionid check --db <db>` |
| Safe diagnosis | `unionid doctor --db <db> --format json` |
| Backup/restore | `unionid backup ...` / `unionid restore ...` |
| Offline compact | `unionid compact --db <db>` |
| Preview receipt cleanup | `unionid receipts retain --db <db> --min-age-seconds <s>` |
| Rust bindings | `unionid query rust --schema schema.unid --dir queries --output generated/queries.rs` |

Add `--format json` for automation and branch on structured codes and exit classes.

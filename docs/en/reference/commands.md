# Command quick reference

| Goal | Command |
| --- | --- |
| Initialize | `unionid init <dir>` |
| Check project | `unionid project check --dir <dir>` |
| Run a file | `unionid run --db <db> --file <file>` |
| Local REPL | `unionid cli --db <db>` |
| Start server | `unionid server --db <db> --addr 127.0.0.1:7878` |
| Connect client | `unionid cli --addr 127.0.0.1:7878` |
| Format check | `unionid fmt --check <file>` |
| Check schema | `unionid schema check --file schema.unid` |
| Print schema | `unionid schema print --db <db>` |
| Draft migration | `unionid migration diff --db <db> --schema schema.unid --name <name>` |
| Plan/apply | `unionid migration plan/apply --db <db> --dir migrations` |
| Integrity check | `unionid check --db <db>` |
| Safe diagnosis | `unionid doctor --db <db> --format json` |
| Backup/restore | `unionid backup ...` / `unionid restore ...` |
| Offline compact | `unionid compact --db <db>` |
| Rust bindings | `unionid query rust --schema schema.unid --dir queries --output generated/queries.rs` |

Add `--format json` for automation and branch on structured codes and exit classes.

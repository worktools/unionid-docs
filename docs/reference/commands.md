# 命令速查

| 目标 | 命令 |
| --- | --- |
| 初始化项目 | `unionid init <dir>` |
| 检查项目 | `unionid project check --dir <dir>` |
| 执行文件 | `unionid run --db <db> --file <file>` |
| 启动本地 REPL | `unionid cli --db <db>` |
| 启动 server | `unionid server --db <db> --addr 127.0.0.1:7878` |
| 连接 server | `unionid cli --addr 127.0.0.1:7878` |
| 格式检查 | `unionid fmt --check --file <file>` |
| 获取 LLM 查询上下文 | `unionid docs query --format json` |
| 检查 schema | `unionid schema check --file schema.unid` |
| 导出 schema | `unionid schema print --db <db>` |
| 生成 migration | `unionid migration diff --db <db> --schema schema.unid --name <name>` |
| 计划 migration | `unionid migration plan --db <db> --dir migrations` |
| 应用 migration | `unionid migration apply --db <db> --dir migrations` |
| 查看状态 | `unionid migration status --db <db> --dir migrations` |
| 完整检查 | `unionid check --db <db>` |
| 无修改诊断 | `unionid doctor --db <db> --format json` |
| 备份 | `unionid backup --db <db> --output <file>` |
| 还原 | `unionid restore --backup <file> --db <new-db>` |
| 离线压缩 | `unionid compact --db <db>` |
| 生成 Rust binding | `unionid query rust --schema schema.unid --dir queries --output generated/queries.rs` |

为自动化添加 `--format json`，根据结构化 code 与退出类处理错误。

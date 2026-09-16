# 五分钟开始

这条路径从一个已安装的 `unionid` 二进制和空目录开始，最终得到一个可重开的 redb 数据库、可重复执行的 migration、typed query 和已验证的备份。

## 1. 安装并确认版本

需要 Rust 1.94 或更高版本：

```bash
cargo install unionid --locked
unionid version --format json
unionid doctor --format json
```

也可以使用 release archive，或在源码仓库执行 `cargo build --locked`。从下一步开始三种入口完全相同。前两条诊断命令不会创建数据库。

## 2. 生成项目

```bash
mkdir unionid-first-use
cd unionid-first-use
unionid init tasks
cd tasks
unionid project check --dir .
```

`init` 只接受不存在或空目录，不会覆盖文件。它生成：

- `schema.unid`：期望 schema；
- `migrations/0001_initial.unid`：初始 migration；
- `seed.unid`：typed seed；
- `queries/list_running.unid`：匹配 `State::Running` 的 query；
- `data/`：默认忽略的本地数据库目录。

`project check` 依次检查规范格式、migration 最终 schema 和 query binding，但不会创建数据库。

## 3. 建库、写入、查询

```bash
unionid migration apply --db data/tasks.redb --dir migrations
unionid run --db data/tasks.redb --file seed.unid
unionid run --db data/tasks.redb --file queries/list_running.unid
```

最后一条命令在新进程中重新打开数据库，返回 seed 中的 `Running` task。结果保留完整 sum variant 与 record payload；字段、constructor、payload 和 match coverage 在扫描前检查。

## 4. 诊断与完整性检查

```bash
unionid doctor --db data/tasks.redb --format json
unionid check --db data/tasks.redb
```

`doctor` 检查权限受限的临时副本，不修改请求路径；`check` 打开原数据库，验证 redb、catalog、schema hash、typed rows、RowId、索引和 migration ledger。

## 5. 备份与还原

```bash
unionid backup --db data/tasks.redb \
  --output data/tasks.backup.json --format json
unionid restore --backup data/tasks.backup.json \
  --db data/restored.redb --format json
unionid run --db data/restored.redb \
  --file queries/list_running.unid
unionid check --db data/restored.redb
```

`restore` 只写入不存在的新路径。还原后应得到相同的 schema identity、typed rows 和查询结果。

## 接下来做什么

- 修改 schema：阅读[项目结构](./project-layout)和[迁移](/operations/migrations)。
- 写更多查询：阅读[查询 pipeline](/language/queries)。
- 嵌入 Rust：阅读[Rust API](/integration/rust)。
- 启动服务：阅读[网络协议](/integration/protocols)和[部署](/operations/deployment)。

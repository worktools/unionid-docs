# CLI 完整参考

本页按“自动化是否可依赖”的标准描述 `unionid` 命令行。示例中的 `app.redb`、`schema.unid` 和 `migrations/` 都应替换为你的路径。

## 全局约定

- 文本输出面向人；脚本应优先选择支持的 `--format json`。
- 查询 JSON 保持 `QueryResponse` 兼容；非查询命令使用统一、脱敏的错误 envelope。
- 需要访问 redb 的命令遵守单写者规则；占用冲突返回 `E_BUSY`。
- 维护命令不会隐式修复、升级或删除数据。带破坏性的动作要求显式 `--confirm`。

## 运行、客户端与服务

```bash
unionid run --db app.redb --file app.unid
unionid cli --db app.redb
unionid server --db app.redb --addr 127.0.0.1:7419
unionid cli --addr 127.0.0.1:7419
```

`run` 执行文件中的一个原子脚本。`cli` 不带脚本时进入 REPL；本地模式直接打开数据库，远程模式使用 version 1 请求协议。生产服务需要只读副本时，给相应入口传入 `--read-only`；解析和绑定仍会执行，但 mutation 在候选状态或持久事务产生前返回 `E_READ_ONLY`。

REPL 的 `.tables`、`.types`、`.schema`、`.storage` 使用共享 introspection，因此 memory、redb 和 TCP 模式的含义一致。未完成输入不会因空行或 EOF 被误提交。

## 项目骨架与整体验证

```bash
unionid init tasks
unionid project check --dir tasks
```

`init` 只写入显式目标，要求目录不存在或为空，不搜索父目录、不创建数据库；落盘前先验证内置 schema、初始 migration、seed 和 typed query。`project check` 按固定顺序检查 `schema.unid`、`migrations/` 和 `queries/`，证明 migration 最终达到声明式 schema，并在同一 schema 上绑定全部查询。它不执行 seed 或打开数据库；上限是 256 个源码文件、512 个目录项、16 层查询目录、单文件 1 MiB、项目源码合计 8 MiB。

## 源码格式化

```bash
unionid fmt --file app.unid
unionid fmt --check --file app.unid
```

formatter 以 parser 为准，输出无分号的规范布局，并保留表达式优先级需要的括号。CI 应使用 `fmt --check`；成功意味着 parse/format 幂等，不代表 schema 能在目标数据库上应用。

## Schema 工具

```bash
unionid schema check --file schema.unid
unionid schema print --db app.redb
unionid schema rust --file schema.unid --output src/schema.rs
unionid schema describe --file schema.unid --format json
unionid schema describe --db app.redb --format json
```

`schema check` 只验证声明；`schema print` 输出规范形式。`schema rust` 生成命名 ADT 的 Rust 类型。`schema describe` 输出 portable contract version 1：schema identity、稳定 ID、递归引用、精确 scalar 约束、默认值、表、主键和索引；不会包含行、数据库 instance、cursor secret 或业务值。`--db` 模式从数据库的私有逐字节副本读取，避免检查行为改变原文件。

## 静态查询契约与代码生成

```bash
unionid query describe --schema schema.unid --file queries/find_task.unid --format json
unionid query rust --schema schema.unid --file queries/find_task.unid \
  --name find_task --output src/find_task.rs
unionid query rust --schema schema.unid --dir queries --output src/queries.rs
```

每个查询文件只能包含一个 prepared operation。`query describe` 使用真实 parser、binder 和类型 IR，报告参数、结果列、基数、mutation/affected-row 语义和所需 schema identity。`query rust` 从同一契约生成 schema ADT、`Params`、结果行与 Engine 调用函数；返回类型按基数为 `T`、`Option<T>` 或 `Vec<T>`。生成函数在 prepare 前核对 revision/hash，漂移明确返回 `E_SCHEMA_CHANGED`。目录模式递归读取查询，只生成一份共享 ADT，任一绑定或命名冲突都使整个输出保持不变。

## 迁移

```bash
unionid migration status --db app.redb --dir migrations
unionid migration plan --db app.redb --dir migrations
unionid migration apply --db app.redb --dir migrations
unionid migration advance --db app.redb --dir migrations --max-steps 100
unionid migration abort --db app.redb
unionid migration rehearse --db app.redb --dir migrations
```

`plan` 不写入；`apply` 尝试完成迁移；format-6 shadow migration 可用 `advance` 在每次已提交 maintenance action 后返回。`abort` 只处理允许回退的 building 状态，不会倒退已 cutover 的 schema。`rehearse` 在私有副本上演练，不把结果写回原数据库。

## 完整性、升级与压缩

```bash
unionid check --db app.redb
unionid upgrade --db app.redb --target 4
unionid compact --db app.redb
unionid doctor --db app.redb --format json
unionid version --format json
```

`check` 同时运行 redb 与 unionid 逻辑检查。`upgrade` 是显式、同步、two-phase 的格式升级。`compact` 是离线维护：先做备份，保证没有其他进程、活跃 snapshot 或未完成 maintenance，并预留时间、内存与磁盘；中断或 `E_STORAGE_REOPEN_REQUIRED` 后必须重开并运行 `check`。`doctor` 只检查私有临时副本，不修复、创建或升级指定数据库。

## 回执维护

```bash
unionid receipts status --db app.redb --format json
unionid receipts prune --db app.redb --through-sequence 12000 --max-receipts 500
unionid receipts prune --db app.redb --through-sequence 12000 --max-receipts 500 --confirm
```

prune 默认仅预览；只有 `--confirm` 才在原子提交中删除。也可按时间 cutoff 规划。回执是 exactly-once effect 的持久组成，不应作为普通缓存随意清空。

## 增量备份

```bash
unionid backup incremental init --db app.redb --repo backup-repo
unionid backup incremental export --db app.redb --repo backup-repo
unionid backup incremental list --repo backup-repo
unionid backup incremental verify --repo backup-repo
unionid restore incremental --repo backup-repo --db restored.redb
```

`init` 是启用 journal 以及将 format 6 显式升级到 7 的授权。`export` 只发布完整连续 commit。恢复目标必须是新路径；还原后会获得新的数据库/cursor identity。

## 稳定退出码

| 退出码 | 类别 | 自动化建议 |
| --- | --- | --- |
| `0` | 成功 | 继续 |
| `1` | 未分类错误 | 记录 envelope，人工判断 |
| `2` | 参数或配置 | 修正调用，不重试 |
| `3` | 输入、schema 或 migration | 修正源码/契约，不重试 |
| `4` | 连接或 `E_BUSY` | 有界退避后重试 |
| `5` | 存储或结果不确定 | 停止写入，重开并 `check` |
| `6` | 完整性失败 | 隔离数据库并恢复/调查 |

不要只解析人类可读 stderr 来决定恢复动作；同时使用退出码、JSON error code 和“结果是否不确定”的语义。

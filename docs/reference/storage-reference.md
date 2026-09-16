# 存储、迁移与恢复完整参考

本页描述运维必须依赖的 durable contract。内部 redb 表名与页面布局不是公开 API；schema identity、RowId、migration ledger、backup archive 和明确的故障分类才是。

## 持久状态模型

redb backend 把 catalog、rows、secondary indexes、migration ledger、receipts 与 durable head 放在同步事务中提交。普通 DML 从 write set 生成 stable-key delta；DDL、migration、upgrade、restore 和 receipt prune 明确走 full rebuild 或 maintenance 路径。

RowId 是表内单调 `u64`：删除产生的缺口合法且不会复用。应用不能假设连续，也不应把 RowId 当业务主键。主键、unique/ordinary index 和 typed row 必须在完整性检查中相互一致。

## 打开与故障分类

同一数据库同时只能有一个 writer；第二个写入口得到 `E_BUSY`。只读入口仍要遵守文件与版本兼容要求。

| 时点 | 语义 | 操作 |
| --- | --- | --- |
| durable commit 前失败 | 确定未提交 | 可有界重试 |
| commit 成功并返回 | 确定提交 | 向调用方确认 |
| commit 调用返回错误 | 结果不确定 | 停止写、关闭、重开、`check` |
| 完整性检查失败 | durable state 不可信 | 隔离并从已验证备份恢复 |

不要在“结果不确定”后继续复用 Engine，也不要根据文件大小或客户端是否收到响应推断提交结果。mutation 使用 idempotency key 才能安全处理“提交成功但响应丢失”。

## 版本维度

软件版本、protocol version、storage format、各 codec version 和 schema revision/hash 彼此独立。普通 open 不承诺隐式升级旧格式；`upgrade --target N` 才是升级 durable layout 的显式授权。升级前后都应记录 `version --format json`、`.storage` 与 `check` 结果。

## Migration ledger

迁移文件按不可变 checksum 形成单链。已经记录的文件不得改写、重排或复用名称；新增迁移只能追加。一次 schema 变更生成一个 revision 与 SHA-256 identity。稳定 type/field/variant/table/index ID 允许 rename 后保持身份，但仅在同一 lineage 中有意义。

标准上线顺序：

1. 备份并验证可恢复。
2. `migration status` 检查 ledger 与目录。
3. `migration plan` / `rehearse` 在写入前检查兼容与容量。
4. 安排写入维护窗口。
5. `apply`，或用 `advance --max-steps` 有界推进。
6. 重开、`check`，再执行应用 smoke test。

## Shadow migration 状态机

format-6 大迁移使用 shadow generation。`Building` 期间读取继续来自旧 generation，普通写入被阻止；达到 `Ready` 后原子 cutover；`Reclaimable` 只剩旧逻辑 key 回收。每个 `advance` step 都是已提交 action，进程重启后可从 durable maintenance state 继续。

`abort` 仅能撤销允许回退的 building 状态。cutover 后不能假装回到旧 schema。shadow generation 有 1 GiB logical cap；超过上限应拆分迁移或扩大维护方案，而不是绕过预算。单步 delay 最长 60 秒，调用方必须设置外部监督和 deadline。

generation reclaim 只删除旧逻辑 key，不保证 redb 文件缩小；物理回收要运行离线 `compact`。

## 完整性检查

`unionid check --db app.redb` 先运行 redb 检查，再验证 unionid catalog、typed rows、indexes、schema hash、ledger、RowId allocator 和 receipts。它是故障恢复后的判定工具，不是自动修复器。

## 完整备份与恢复

完整 backup 应保存可移植的逻辑状态与版本信息，并在独立路径恢复后验证。恢复不能覆盖正在使用的数据库。恢复完成后，schema/data/ledger/receipts 必须一致；数据库与 cursor identity 会重新建立，旧 cursor 不得继续使用。

## 增量备份协议

增量 archive codec 1 由 baseline、manifest、连续 segment 和源 journal 组成。`init` 从独占打开且完整检查的 committed view 写出并重读 baseline，再发布 prepared manifest，最后同步启用 journal 和 active manifest。该动作是 format 6 → 7 的显式授权。

`export` 仅导出完整连续 commit：先发布不可变 segment，再原子更新 manifest，最后裁剪源 journal。默认 segment 边界为 1000 commits 或 64 MiB。中断后的重复 journal 可在下一次 export 对账裁剪；未被 manifest 引用的文件由 `verify` 报告为 orphan。

恢复目标必须是不存在的新路径，可选择 sequence cutoff；恢复器拒绝缺口、checksum 不符和 lineage 不一致。恢复后运行 `check`，并从应用层抽样比较关键行。

## 离线压缩

压缩前必须：验证备份、停止所有进程、确认没有 unfinished maintenance，并预留 redb 搬页与多次 sync 所需空间。压缩会完整遍历数据库，不是廉价健康检查；原生提交开始后 Ctrl-C 不提供事务级取消保证。

工具在 native compact 后、post-check 前重开数据库，使 region repair 纳入同一次维护。`changed` 只表示文件确实变小；重复执行应稳定 no-op，但仍会完整遍历。任何中断、I/O、post-check 或 view rebuild 错误后，都必须重新打开并运行 `check`。

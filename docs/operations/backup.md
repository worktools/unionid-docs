# 备份、还原与压缩

## Logical backup

```bash
unionid backup --db app.redb \
  --output app.backup.json --format json
unionid restore --backup app.backup.json \
  --db restored.redb --format json
unionid check --db restored.redb
```

backup 保存 schema、ledger、typed rows、索引所需身份和 receipts。restore 只写不存在的新路径，并生成新的数据库/cursor identity，因此源库 cursor 不能用于副本。

备份完成不等于可恢复：应定期在隔离路径执行 restore、业务查询和 `check`。

## 增量备份

增量 journal 必须显式启用，会进入对应的 journal 格式：format 6 → 7、8 → 9、10 → 11（新数据库默认是 format 10）。先保留完整 logical backup，再初始化 archive chain。每段带 sequence、parent、schema/ledger 摘要和校验；restore 必须按链顺序验证，不能跳过或拼接不同数据库实例的 segment。

journal 格式没有原地 downgrade，停用增量备份也不会把 format 11 降回 10。需要回到不支持它的旧二进制时，用启用前的 logical backup 还原新库。

## Receipt 保留

幂等 receipt 默认不自动 TTL/LRU。删除 receipt 会恢复旧 key 的可执行性，只有所有客户端和队列都越过重试窗口后才能清理。

```bash
unionid receipts status --db app.redb
unionid receipts retain --db app.redb --min-age-seconds 86400 --max-receipts 1000 --format json
# 确认预览和重试窗口后：
unionid receipts retain --db app.redb --min-age-seconds 86400 --max-receipts 1000 --confirm --format json
```

`receipts retain` 按 UTC 完成时间选择早于 `now - 窗口` 的回执，默认只在临时副本上预览，每轮最多 1,000 条；`--confirm` 会在实际写入所有权下重新取样时间和选择，旧预览不是批准令牌。需要按 time/sequence cutoff 精确清理时仍可用 `receipts prune` 先预览再 confirm。

服务也可以显式开启周期清理，默认关闭：

```bash
unionid server --db app.redb \
  --receipt-retention-seconds 86400 \
  --receipt-retention-interval-seconds 60 \
  --receipt-retention-max-receipts 1000
```

只设置周期或上限而不设窗口会报配置错误；只读和旧 WAL 模式拒绝启用。维护线程与写入共享写锁，写锁忙时跳过本轮，migration maintenance 未完成时暂停；观测到系统时间回退时不删除。策略不写入数据库或备份，重启后需要重新配置。Rust/HTTP 嵌入方可用 `ConcurrentEngine::start_receipt_retention(schedule, shutdown)` 启动同样的 worker。窗口必须长于所有客户端、队列和人工重放的最大重试时间。

## 离线压缩

generation reclaim 不保证 redb 文件物理缩小。需要回收高水位时：停止 server、完成 migration maintenance、创建并验证 backup，然后运行：

```bash
unionid compact --db app.redb
unionid check --db app.redb
```

compact 保留 storage format、schema、sequence、ledger、RowId、receipt 与 cursor identity。它不是备份，可能多次完整遍历；Ctrl-C 或结果不确定后必须重开检查。

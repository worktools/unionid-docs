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

增量 journal 必须显式启用，会把 format 6 升到 7。先保留完整 logical backup，再初始化 archive chain。每段带 sequence、parent、schema/ledger 摘要和校验；restore 必须按链顺序验证，不能跳过或拼接不同数据库实例的 segment。

format 7 没有原地 downgrade。需要回到不支持它的旧二进制时，用启用前的 logical backup 还原新库。

## Receipt 保留

幂等 receipt 默认不自动 TTL/LRU。先按 time/sequence cutoff preview，再显式 confirm prune。删除 receipt 会恢复旧 key 的可执行性，只有所有客户端和队列都越过重试窗口后才能清理。

## 离线压缩

generation reclaim 不保证 redb 文件物理缩小。需要回收高水位时：停止 server、完成 migration maintenance、创建并验证 backup，然后运行：

```bash
unionid compact --db app.redb
unionid check --db app.redb
```

compact 保留 storage format、schema、sequence、ledger、RowId、receipt 与 cursor identity。它不是备份，可能多次完整遍历；Ctrl-C 或结果不确定后必须重开检查。

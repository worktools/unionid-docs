# 错误、限制与预算

## 重要错误类别

| Code / 状态 | 含义 | 调用方动作 |
| --- | --- | --- |
| `E_SCHEMA` | schema/type 无效 | 修正声明或 migration |
| `E_CONSTRAINT` | 主键/unique/形状约束失败 | 修正数据；不会部分提交 |
| `E_ARITH` | 溢出、除零、非有限 float | 修正表达式或输入 |
| `E_READ_ONLY` | 只读边界拒绝 mutation | 改用授权写实例 |
| `E_BUSY` | 文件已有写所有者 | 停止重复进程 |
| `E_INDEX_KEY_LIMIT` | 索引 key 超限 | 缩短 indexed value 或调整模型 |
| cursor expired | 数据/schema/query 已变化 | 从第一页重新开始 |
| outcome uncertain | commit 结果不确定 | 重开、check、查询 receipt/业务键 |

## 固定或默认边界

- recursive value/pattern/schema 深度：64；
- composite index component：1–16；
- indexed bytes leaf：8192 octets；
- 完整 index key：64 KiB；
- 普通 typed value：16 MiB；
- 单次 batch：最多 100,000 rows；
- `ConcurrentEngine` 一致并发读快照：最多 8；
- 服务 operation registry、stream frame/bytes、工作内存与 deadline 均有界。

具体运行上限由版本和配置决定。不要把 100k 测试上限当作默认容量承诺；上线前用真实 schema、索引和值分布做副本演练。

## 一致性提醒

- 一个请求内原子；多个请求不承诺共享同一 snapshot。
- cursor 不是历史快照，成功写入会使旧 cursor 过期。
- stream 是单次有限结果，不是订阅或 CDC。
- read-only 是执行边界，不是 OS 文件权限或网络授权。

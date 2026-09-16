# 服务部署与资源边界完整参考

unionid 服务把同一 Engine 暴露给 TCP/HTTP adapter，但不内置公网身份系统。生产部署必须显式处理认证、TLS、流量限制、超时、备份与 shutdown。

## 信任边界

推荐只监听 loopback 或私网地址，由反向代理/service mesh 提供 mTLS、身份映射、IP/租户限流与审计。不要把裸 TCP/HTTP 端口直接暴露到公网。查询文本、参数、row、cursor、operation capability 和 idempotency key 都可能敏感，不应进入普通 access log。

只读节点应使用真正的 read-only Engine，而不是仅在路由层隐藏写 endpoint。read-only 状态可通过 introspection 验证。

## 固定资源上限

这些限制属于首版服务契约；超过上限会明确失败，不会无限排队或分配：

| 资源 | 上限 |
| --- | ---: |
| TCP connections | 64 |
| 一致并发 read snapshots | 8 |
| active cancellable reads | 64 |
| terminal tombstones | 256，保留 60 秒 |
| stream producer queue | 8 frames / 16 MiB |
| 单个 stream frame | 16 MiB |
| 单次 stream 总量 | 100,000 rows / 256 MiB |
| 请求 frame | `6 × 1 MiB + 256 B` |
| query source | 1 MiB / 100,000 tokens / 64 nesting levels |
| 单个 typed value | 16 MiB / depth 64 / collection 1,000,000 items |
| working rows | 250,000 |
| materialized result rows | 100,000 |
| page | 1,000 rows / 16 sort keys / 8 KiB cursor |
| DML returning | 100,000 rows / 8 MiB wire rows |
| introspection response | 1 MiB |
| request ID | 1 KiB |
| idempotency key / receipt | 256 B / 1 MiB |
| receipt store | 10,000 entries / 64 MiB |
| TCP response | 16 MiB |
| request deadline | 25 s |
| idle connection / socket write | 30 s / 5 s |
| match coverage analysis | 100,000 steps |

容量规划必须留出低于上限的余量；上限是防御边界，不是建议的日常负载。当前实测结论约 10k 行是舒适范围，100k 是容量上限验证，不代表写入延迟目标。

## 并发与背压

读请求获得 immutable committed snapshot，最多 8 个同时执行；writer 和 maintenance 串行。active/queued read/write 与 peak readers 可观测。adapter 必须在接收层限制连接与 frame，在执行层设置 deadline，在输出层尊重 bounded channel 和 socket write timeout。慢客户端不能无限持有 snapshot 或内存。

## 可取消流协议

server 先返回并 flush `accepted`（含 server-issued `o1` capability），之后按 `schema`、零到多条 `row`、恰好一个 `complete` 或 `error` 发送 NDJSON。terminal frame 只能在线性化点产生一次。`cancel` 的结果是 `accepted`、`already_terminal`（含 outcome）或 `unknown`。

capability 是 128-bit bearer secret，只存在进程内 registry；不持久化、不记录 query/params，也不得写日志。断线不提供隐式续传，partial stream 不能转换为 page cursor。

## 优雅关闭

SIGINT/SIGTERM 应驱动共享 shutdown：

1. 停止接收新连接和 operation。
2. 唤醒 queued work，令其返回 shutdown 错误。
3. 通知执行中的读取在控制检查点退出。
4. 等待 bounded worker 和响应 flush 到截止时间。
5. 串行写/maintenance 完成或按结果不确定规则进入重开检查。
6. 输出不含业务数据的最终统计并关闭数据库。

嵌入式服务可用 `server::serve_until` / `serve_until_concurrent` 连接同样的 `AtomicBool` shutdown，并在返回时读取 `ServerStats`。

## 指标

`ConcurrentEngine::metrics_snapshot()` 返回 versioned、process-local、弱一致快照。operation class 固定为 read、write、introspection、receipt、stream、maintenance；error code cardinality 最多 64，之后进入 overflow。指标包含请求、错误、延迟 histogram、并发、连接和 receipt 容量，不含 source、参数、row、key、cursor 或 capability。

默认关闭的 `metrics` feature 只负责渲染 Prometheus 文本，不会自动开放 endpoint。应用应把 exporter 挂在受认证的内部端点，并在抓取侧设置保留期。进程重启后 counter 生命周期重置，不能把它当 durable audit log。

## 结构化 observer

`ConcurrentEngine::with_observer` 为每个 core request 产生恰好一个 value-free terminal event；达到显式阈值并通过有界采样时追加 slow-query event。事件只保留 access/stage kind、plan/work 计数、耗时和终态。request ID 默认省略；如需关联，只保存带独立 secret 的 HMAC 摘要。

可选 `tracing` feature 不自动启动 collector。部署方负责队列上限、采样、脱敏、传输加密和保留策略。observer/exporter 故障不得改变数据库提交结果。

## 上线检查表

- 固定二进制版本并记录 protocol/storage/codec support。
- 在隔离副本完成 migration rehearsal、完整恢复与 `check`。
- 监听私网；在代理层启用 mTLS、认证、请求体和速率限制。
- 配置 25 秒以内的上游 deadline、30 秒以内 idle、5 秒写超时。
- 将数据库、备份仓库和日志放在不同故障域。
- 对 `E_BUSY`、`E_STORAGE_REOPEN_REQUIRED`、完整性失败、receipt 容量和 queue saturation 告警。
- 演练 SIGTERM、响应丢失后的幂等重试、backup restore 与 cursor expiry。

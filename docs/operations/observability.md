# 指标、Explain 与事件

## 查询级诊断

先用 `explain` 检查访问计划，再用 `explain analyze` 获得 value-free 实测画像。关注：

- examined / returned 比例：过高通常需要索引或更早 filter；
- decoded rows 与 redb cache：判断存储读取成本；
- work memory peak：缩小 page/batch 或减少 blocking stage；
- index entry：确认 planner 是否使用预期复合索引。

## 进程指标

`ConcurrentEngine::metrics_snapshot()` 返回有版本、有限 cardinality 的请求、错误、延迟、并发、连接与 receipt 指标。可选 `metrics` feature 只把同一快照渲染为 Prometheus 文本，不自动暴露 endpoint。

应用负责把 endpoint 放在受控网络、限制抓取身份和保留期限。不要添加 table、query、参数、request ID 等高基数或业务 label。

## Terminal 与慢查询事件

`ConcurrentEngine::with_observer` 为每个 core request 产生一个 value-free terminal event，并按阈值/采样附加 slow-query event。默认不输出 request ID；需要关联时显式配置 HMAC key，只输出不可逆 `hmac1:` digest。

observer 同步调用，应快速复制到有界 channel 后返回。panic 与数据库结果隔离；应用负责 queue、disk 和 label 上限。`storage_outcome_uncertain` 事件要求重开并执行 `check`。

## 排障顺序

1. 看 aggregate metrics 判断是否是全局拥塞。
2. 对具体 query 运行 explain/analyze。
3. 短时间降低 slow threshold 或提高采样。
4. 检查索引、page/batch 大小和工作内存。
5. 不把业务数据加入观测事件。

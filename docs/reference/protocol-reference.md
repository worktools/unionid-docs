# 数据协议完整参考

## 普通请求

TCP 每个 request/response 各占一个物理 JSON line。HTTP `POST /v1/query` 使用同一 JSON body 与语义。

```json
{
  "version": 2,
  "request_id": "task-42",
  "query": "from tasks\nfilter id == $id\nselect {id, title}",
  "params": {
    "id": {"type": "int", "value": "9007199254740993"}
  },
  "schema": {"revision": 3, "hash": "sha256:..."}
}
```

| 字段 | 规则 |
| --- | --- |
| `version` | 1 或 2；其他值返回 `E_PROTOCOL_VERSION` |
| `request_id` | UTF-8，最多 1 KiB；仅关联尝试，不去重 |
| `query` | 完整源码，最多 1 MiB |
| `params` | 可选 named typed values；必须与 `$name` 精确匹配 |
| `schema` | 可选 revision/hash precondition；不匹配时扫描前返回 `E_SCHEMA_CHANGED` |
| `idempotency_key` | mutation 可选，1–256 UTF-8 bytes |
| `page` | 可选 `{limit,direction,cursor}`；与源码 page 二选一 |
| `introspect` | `schema/tables/types/storage`；不能与 query/params 混用 |
| `receipts` | 独立 status/prune 操作；不能与 query 混用 |

## Typed wire value

i64、ID 与有限 f64 使用 string，避免 JSON number 精度差异。Null、None、空 list 与 unit variant 是不同结构。

```json
{"type":"int","value":"-9223372036854775808"}
{"type":"float","value":"1.25"}
{"type":"option","value":null}
{"type":"list","items":[]}
{"type":"tuple","items":[{"type":"int","value":"1"}]}
{"type":"record","fields":{"id":{"type":"int","value":"1"}}}
{"type":"variant","name":"Running","variant_id":"17","args":[]}
{"type":"named","type_id":"9","value":{"type":"variant","name":"Pending","variant_id":"16","args":[]}}
```

上下文明确的参数可用 `type_id/variant_id = "0"` 让 binder 按名称解析；结果始终返回稳定 catalog ID。Protocol v2 另定义 UUID、bytes、date、timestamp、duration 和 decimal canonical envelope。

## 响应

成功响应包含 request version/id、`ok`、message、columns、typed rows、schema identity，以及操作相关字段：`affected_rows`、`upsert_actions`、`page`、`idempotency`、`introspection` 或 analysis。失败响应保留 request ID 与当前 schema，并返回结构化 `error {code,message,span?}`。

TCP 完整 response 上限 16 MiB。Introspection payload 上限 1 MiB。服务用限长 writer 编码；超限结果被替换为小型 `E_LIMIT`，不会分配无界 JSON buffer。

## 幂等 mutation

Canonical digest 包含 version、精确 query UTF-8、排序后的 typed params 与 schema precondition；不包含 request ID、key 本身或 deadline。

```json
{
  "version": 2,
  "request_id": "attempt-1",
  "query": "insert tasks $row\nreturning",
  "params": {"row": {"type": "record", "fields": {}}},
  "idempotency_key": "create-task-42"
}
```

相同 key/digest 重放完整成功响应并标记 `replayed: true`；相同 key 不同 digest 返回 `E_IDEMPOTENCY_CONFLICT`。普通失败不占 key。Commit 不确定时重开连接/数据库，用完全相同的 query、wire params、schema precondition 与 key 重试。

Receipt store 上限 10,000 条 / 64 MiB，单 receipt 1 MiB。达到容量时新 key 返回 `E_IDEMPOTENCY_CAPACITY`，已有 key 仍可 replay。没有自动 TTL/LRU。

## 结构化分页

```json
{
  "version": 2,
  "request_id": "tasks-2",
  "query": "from tasks\nfilter archived == false\nsort {-priority, id}",
  "page": {"limit": 100, "direction": "forward", "cursor": "u1.payload.mac"}
}
```

第一页省略 cursor。服务把结构化 page 归一为最终 pipeline stage。它只接受单条 read pipeline；不能与 mutation、introspection、receipt、idempotency key 或源码 page 混用。

## Introspection

```json
{"version":1,"request_id":"inspect-1","query":"","introspect":"storage"}
```

返回 schema identity、canonical schema、table/type/field、storage mode、read-only、migration count/head 和 maintenance。它不执行 query 或修改数据。

## Stream protocol v1

Stream 使用独立 query/cancel envelope，frame 顺序为：

```text
accepted(operation capability)
schema(columns)
row(value)*
complete(counts)
```

任一路径只有一个 terminal `complete` 或 `error`。Capability 是 server-issued 128-bit bearer，不持久化、不得记录。Registry 64；terminal tombstone 256/60 秒；channel 8 frames/16 MiB queued；单 frame 16 MiB；总结果 100,000 rows/256 MiB。Producer 背压期间每 100 ms 检查 cancel/shutdown/deadline。

完整结果在 emitting 前释放 snapshot。Partial stream 没有隐式 resume；可靠续读使用 page cursor。

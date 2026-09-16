# Rust API 完整参考

Rust 嵌入式 API、CLI 与网络 adapter 共用 `Engine` 语义。应用不需要维护另一套类型转换或查询执行逻辑。

## 选择 Engine

```rust
use unionid::Engine;

let mut temporary = Engine::memory();
let mut durable = Engine::open_redb("app.redb")?;
let mut replica = Engine::open_redb_read_only("replica.redb")?;
# Ok::<(), Box<dyn std::error::Error>>(())
```

- `memory()` 用于测试、短生命周期任务和纯内存服务。
- `open_redb()` 获取单写者所有权，并在打开时验证可见 durable state。
- `open_redb_read_only()` 建立统一只读边界；写操作在完整 parse/bind 后返回 `E_READ_ONLY`。

一个 `Engine` 表示一个已提交根。每个脚本是原子的：成功发布完整新状态，失败保留原状态。

## Prepare、绑定与解码

```rust
use std::collections::BTreeMap;
use unionid::{Engine, Value};

#[derive(serde::Serialize)]
struct NewTask { id: i64, title: String }

#[derive(serde::Deserialize)]
struct Task { id: i64, title: String }

let mut engine = Engine::open_redb("app.redb")?;
let insert = engine.prepare("insert tasks $row\nreturning")?;
let response = engine.execute_prepared(
    &insert,
    BTreeMap::from([("row".into(), Value::from_serde(&NewTask {
        id: 1,
        title: "ship docs".into(),
    })?)]),
);
let rows: Vec<Task> = response.typed_rows()?;
# Ok::<(), Box<dyn std::error::Error>>(())
```

`prepare` 在扫描前绑定参数类型、DML 结构与结果 schema，并记录当前 schema revision/hash。prepared operation 在 schema 变化后执行会明确失败。`Value::from_serde` 保留 struct、enum、option、tuple 与 list 的形状；内部 nominal ID 不进入 serde representation。`typed_rows` 对 query 与 `returning` 使用同一解码路径。

先检查 `QueryResponse` 的错误再消费 rows。参数缺失、额外参数、错误 variant、overflow 或约束不符都应视为契约错误，不能靠数据库隐式强制转换。

## 生产标量

对 UUID、bytes、date、timestamp、duration 与 decimal 使用 unionid 提供的 wrapper/typed representation。decimal 的 precision/scale 是类型的一部分；timestamp 不推断本地时区；duration 是固定时长，不是 calendar interval。源码、serde、protocol v2、索引、cursor、backup 和 migration 共享同一表示。

## 稳定键读取与分页

`fetch_by_key` / `typed_fetch_by_key` 用完整主键读取，并保持和普通 prepared 查询相同的类型检查。分页使用 `PageSpec` 和响应 cursor；下一页必须复用原查询、参数、顺序和 page size。任意成功写入都会使旧 cursor 明确过期，调用方应重新开始遍历而不是静默继续。

## 幂等 mutation

`execute_idempotent_with_params` 接受独立的 idempotency key。相同 key 加相同 canonical digest 返回原成功响应；相同 key 加不同 digest 冲突；只有确定发生在 transaction commit 前的失败才保证不占 key。commit 不确定时 key 与 receipt 可能已经持久化。持久 Engine 将数据效果与完整成功回执放入同一事务。`request_id` 只关联一次尝试，不能替代 idempotency key。

## 并发服务入口

```rust
use unionid::{ConcurrentEngine, Engine};

let engine = ConcurrentEngine::new(Engine::open_redb("app.redb")?);
let snapshot = engine.metrics_snapshot();
# Ok::<(), Box<dyn std::error::Error>>(())
```

`ConcurrentEngine` 用 immutable committed snapshot 支持最多 8 个一致并发读取；读取在 writer lock 外执行，写入与 maintenance 串行。deadline、shutdown 与 cancel 都通过共享执行控制在 admission、bind 和查询循环检查。HTTP async handler 应把同步数据库调用放入 blocking worker。

需要可取消流读取时，先 `register_read`，把 server-issued capability 发给客户端并 flush，再 `ReadOperation::start()`。capability 是 bearer secret，不得记录、持久化或放入指标标签。

## Protocol API

`protocol::Request` / `Response` 是 transport-neutral 的 versioned data model；TCP 与 HTTP 只是 adapter。`Request::with_serde_param` 生成 typed wire value，`Response::typed_rows` / `typed_page` 无损还原应用类型。仅当值需要 protocol v2 的 production-scalar envelope 且双方支持 v2 时才选择 v2。

## 生成代码与 portable contract

团队项目应把 schema/query 契约生成纳入 CI：

```bash
unionid schema describe --file schema.unid --format json > schema.json
unionid schema rust --file schema.unid --output src/schema.rs
unionid query rust --schema schema.unid --file queries/find.unid --output src/find.rs
```

`PortableContract::validate_type` 使用 prepared binding 同一验证规则，适合在接收网络输入后、调用 Engine 前验证命名类型。稳定 ID 只在同一数据库 lineage 内比较；不要把它当跨项目的全局 ID。

## 错误恢复边界

- commit 前失败：确定回滚，可以按业务策略重试。
- redb commit 返回错误：结果不确定，Engine 会关闭句柄并阻止继续写；必须重开并完整检查。
- `E_BUSY`：另一 writer/maintenance 持有数据库，采用有界退避。
- `E_SCHEMA_CHANGED`：重新生成/prepare，不要绕过校验。
- `E_READ_ONLY`：路由错误或部署策略生效，不应重试到同一实例。

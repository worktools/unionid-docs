# Rust 嵌入式 API

## 打开 Engine

```rust
use unionid::Engine;

let mut memory = Engine::memory();
let mut durable = Engine::open_redb("data/app.redb")?;
let mut read_only = Engine::open_redb_read_only("data/app.redb")?;
```

`Engine` 是本地 API、CLI 和服务的共享入口。每次 `execute` 是原子脚本；生产应用应检查 `QueryResponse.error`，而不是只读取 rows。

## Prepared 参数与 serde

```rust
use std::collections::BTreeMap;
use serde::{Deserialize, Serialize};
use unionid::{Engine, Value};

#[derive(Serialize, Deserialize)]
enum State {
    Pending,
    Running { worker: String, attempt: i64 },
}

#[derive(Serialize, Deserialize)]
struct Task {
    id: i64,
    title: String,
    state: State,
}

let mut db = Engine::open_redb("data/app.redb")?;
let task = Task {
    id: 1,
    title: "ship docs".into(),
    state: State::Pending,
};
let prepared = db.prepare("insert tasks $row\nreturning")?;
let response = db.execute_prepared(
    &prepared,
    BTreeMap::from([("row".into(), Value::from_serde(&task)?)]),
);
let rows: Vec<Task> = response.typed_rows()?;
```

Rust `struct/enum/Option/tuple/Vec` 与命名 ADT 对应，内部 nominal ID 不泄漏到 serde representation。不要手工拼接用户输入；prepared binding 会在扫描前确定完整参数类型。

## 内联查询宏 `queries!`

短小、只归一个 crate 使用的查询可以直接写在 Rust 模块里。`unionid-query` 与 `unionid` 必须使用同一个精确版本：

```toml
[dependencies]
serde = { version = "1", features = ["derive"] }
unionid = "=0.13.2"
unionid-query = "=0.13.2"
```

```rust
unionid_query::queries! {
    schema "schema.unid"

    query find_pending {
        from tasks
        filter state == Pending && priority >= $min_priority
        sort {-priority, id}
        select {id, title, state}
        take 20
    }

    query reprioritize_task {
        update tasks
        filter id == $id
        set priority = $priority
        returning {id, priority, state}
    }
}

use unionid::Engine;
let mut engine = Engine::open_redb("data/app.redb")?;

let rows = find_pending::find_pending(
    &mut engine,
    find_pending::FindPendingParams { min_priority: 3 },
)?;
```

宏在编译期读取 schema 文件（相对于调用 crate 的 `CARGO_MANIFEST_DIR`），复用与 `.unid` 相同的 parser、binder 和代码生成，产出共享 ADT、每个查询的 Params/Row 与执行函数。未知字段、错误构造器、参数类型冲突和不完整的 match 都会让 Rust 编译失败；schema 或查询改动后宏会重新展开。生成函数在运行时仍核对 schema revision/hash，数据库结构漂移时在扫描或写入前返回 `E_SCHEMA_CHANGED`。

宏只接受单条查询或单条 DML（可带一个尾随 `expect`）。宏不在编译时打开 redb：经由 migration 建立稳定 ID、需要按 live catalog 生成绑定的应用，以及跨语言、CLI、LLM 和较大的查询，继续使用独立 `.unid` 文件与 `unionid query rust --db`。

## 生产标量

使用 `unionid::scalars::{Uuid, Bytes, Date, Timestamp, Duration, Decimal}` 保留类型身份。protocol v2 才能无损携带这些标量；decimal 解析时必须提供 precision/scale。

## 并发服务

`ConcurrentEngine` 提供最多 8 个一致并发读快照，读在 writer lock 外执行，写入与 maintenance 串行。使用 deadline、shutdown 和指标观察 active/queued read/write；不要在 observer callback 中做阻塞工作。

## 应用数据边界

将需要恢复的摘要与正文都持久化。一次数据库请求内提交业务数据和应用 revision，成功后再更新内存状态。schema revision、maintenance sequence、cursor 与业务 revision 是不同身份。数据库不负责缓存失效、WebSocket、订阅或用户鉴权。

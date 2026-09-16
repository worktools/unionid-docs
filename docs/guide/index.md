# 先认识 unionid

unionid 是一个用 Rust 编写、把代数数据类型（ADT）直接放进数据库 schema 的轻量数据库。它既可以嵌入 Rust 程序，也可以作为本地 redb 数据库或独立 TCP/HTTP 服务运行。

## 它解决什么问题

传统表通常用状态字符串和一组 nullable 字段表达业务状态。例如任务处于 `Running` 时需要 `worker` 和 `attempt`，处于 `Done` 时需要 `result`。这些约束往往只存在于应用代码中。

unionid 让 schema 直接表达所有合法形态：

```text
type State =
  Pending
  | Running {worker text, attempt int}
  | Done {result text}
  | Failed {message text, retryable bool}
```

数据库会检查 constructor、payload、默认值、字段路径、索引和 migration。查询也理解这些类型，可以穷尽匹配 variant，而不是把 ADT 当成无类型 JSON。

## 三种使用方式

| 方式 | 适合 | 数据存储 |
| --- | --- | --- |
| `Engine::memory()` | 测试、临时计算 | 进程内存 |
| `Engine::open_redb` / `unionid run --db` | 桌面工具、单机服务、嵌入式应用 | redb 文件 |
| `unionid server` + TCP/HTTP adapter | 多进程客户端、受控网络服务 | redb 文件 |

三种入口共用 parser、类型检查、执行器和事务语义。先用 CLI 学习语言，再切到 Rust 或网络接口，不需要重写 schema 和 query。

## 当前边界

- 单机、单数据库所有者、串行写入；`ConcurrentEngine` 可提供最多 8 个一致读快照。
- 约 10,000 行是当前舒适工作集；100,000 行是经过测试的上限，不是日常目标。
- 支持 ADT、索引、聚合、稳定分页和有界 lookup；不提供通用扁平 join、window 或分布式执行。
- 数据库不内置用户、角色、行级权限、订阅、CDC 或应用缓存。授权和缓存一致性由宿主应用负责。

## 推荐阅读顺序

1. [五分钟开始](./getting-started)完成一次建库、写入、重开、检查和备份。
2. [项目结构](./project-layout)理解生成文件如何进入版本控制与部署。
3. [数据建模](/language/data-model)学习 record、sum、option、list 与递归 ADT。
4. [查询](/language/queries)和[写入](/language/mutations)掌握日常数据操作。
5. 根据接入方式阅读 [CLI](/integration/cli)、[Rust API](/integration/rust)或[网络协议](/integration/protocols)。
6. 上线前阅读[生产运维](/operations/)。

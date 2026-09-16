# 应用集成

所有接入方式最终都调用同一个 `Engine` 语义边界。选择方式时主要考虑进程边界、序列化成本、部署责任和是否需要 Rust typed conversion。

| 接入 | 优势 | 主要责任 |
| --- | --- | --- |
| CLI / REPL | 最快学习与运维 | 管理文件和命令退出码 |
| LLM / 代码生成器 | 版本匹配的规则、schema 与静态绑定 | 验证生成源码并审核 mutation |
| Rust Engine | 无网络、typed serde、最低开销 | 应用持有数据库生命周期 |
| TCP JSON Line | 简单跨进程接口 | 连接、deadline、TLS gateway |
| HTTP adapter | 易接入鉴权与异步框架 | route 权限、身份与网络边界 |

从 [CLI](./cli) 开始；需要生成查询时使用 [LLM 查询上下文](./llm)，应用接入再选择 [Rust API](./rust)与[协议](./protocols)。

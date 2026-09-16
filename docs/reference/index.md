# 参考与能力边界

本节把日常查阅信息集中在一起：

- [命令速查](./commands)
- [错误、限制与预算](./limits)
- [版本与兼容性](./compatibility)

遇到行为不确定时，以安装版本的 `unionid <command> --help`、`unionid version --format json` 和 release contract 为准。站点描述当前主线能力，不把未来设计 RFC 当作已实现功能。

## 完整规范手册

速查页用于确认常用参数；以下手册用于实现客户端、评审 schema 或制定生产运行手册，明确区分语法、故障语义与资源上限：

- [语言完整参考](./language-reference)：词法、类型、值、主键、索引、递归和原子脚本。
- [查询与表达式完整参考](./query-reference)：stage 顺序、match、聚合、lookup、分页和 explain。
- [数据协议完整参考](./protocol-reference)：请求 envelope、typed wire value、幂等、分页与 stream frame。
- [CLI 完整参考](./cli-reference)：项目检查、代码生成、维护命令、JSON 和稳定退出码。
- [Rust API 完整参考](./rust-reference)：Engine、prepare/serde、并发、分页与恢复边界。
- [存储、迁移与恢复完整参考](./storage-reference)：commit 确定性、ledger、shadow generation、备份与压缩。
- [服务部署与资源边界完整参考](./service-reference)：信任边界、固定上限、背压、shutdown、指标与 observer。

这些页面是面向使用者的整理，不替代随二进制发布的 machine-readable contract。发布升级时应同时核对文档、`unionid version --format json` 和目标数据库的 `unionid doctor --db <db>` / `unionid check --db <db>` 结果。

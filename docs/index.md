---
layout: home

hero:
  name: unionid
  text: 用 ADT 描述数据，用 pipeline 查询数据
  tagline: 从五分钟建库，到 typed Rust 集成、可恢复 migration、稳定分页与生产运维的一套完整路径。
  actions:
    - theme: brand
      text: 五分钟开始
      link: /guide/getting-started
    - theme: alt
      text: 按顺序阅读
      link: /guide/

features:
  - title: Schema 直接表达业务状态
    details: record、sum、option、list、tuple 与有限递归类型都有稳定身份、默认值、约束和迁移语义。
    link: /language/data-model
  - title: Query 直接理解 ADT
    details: pipeline、穷尽 match、derive、聚合、复合索引、稳定分页和 explain 共用同一类型系统。
    link: /language/queries
  - title: 从开发到生产
    details: CLI、Rust、TCP/HTTP 共用 Engine，并提供备份、可恢复迁移、检查、压缩、指标和受控网络边界。
    link: /operations/
---

## 从一条完整路径开始

安装 `unionid`，生成独立项目，然后完成 migration、seed、query、重开、检查与 backup/restore：

```bash
cargo install unionid --locked
unionid init tasks
cd tasks
unionid project check --dir .
unionid migration apply --db data/tasks.redb --dir migrations
unionid run --db data/tasks.redb --file seed.unid
unionid run --db data/tasks.redb --file queries/list_running.unid
```

这套文档按使用者真实决策组织：先运行，再建模和查询，然后选择接入方式，最后进入生产运维与兼容性参考。

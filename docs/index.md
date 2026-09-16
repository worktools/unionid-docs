---
layout: home

hero:
  name: unionid
  text: 用 ADT 描述数据，用 pipeline 查询数据
  tagline: 一个轻量、类型安全的 Rust 数据库，可作为嵌入式 Engine、本地 redb 数据库或 TCP 服务运行。
  actions:
    - theme: brand
      text: 五分钟开始
      link: /guide/getting-started
    - theme: alt
      text: 了解数据模型
      link: /guide/

features:
  - title: ADT 是 schema 的一部分
    details: struct、enum、option、list、tuple 与有限递归类型由数据库检查，不再藏在无类型 JSON 或 nullable 字段中。
  - title: Pipeline 查询直接理解类型
    details: 组合 filter、match、derive、select、sort、aggregate 与 page，并在扫描前完成类型与穷尽性检查。
  - title: 从嵌入式到服务
    details: 使用同一个 Engine 驱动 Rust API、CLI、TCP 与 HTTP，按需选择内存或 redb 事务存储。
---

## 一个准确表达状态的 schema

```text
type State =
  Pending
  | Running {worker text, attempt int}
  | Done {result text}

type Task = {
  id int,
  title text,
  state State,
}

table tasks Task
  key id
```

查询可以直接解构 variant；新增形态时，旧查询不会静默漏掉它。

```text
from tasks
filter match state {
  Running {attempt, ..} => attempt >= 2,
  _ => false,
}
select {id, title, state}
sort id
take 20
```

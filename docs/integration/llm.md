# 用 LLM 生成 Unionid 查询

Unionid 二进制内置一份与自身版本匹配的紧凑语言参考和可运行示例。LLM、编辑器扩展或代码生成工具无需抓取网站，也不需要猜测当前语法。

## 三层上下文

一次可靠的查询生成应同时提供三类信息：

1. **语言规则与示例**：`unionid docs query`；
2. **目标数据库的 exact schema**：`unionid schema print --db <db> --format json`；
3. **本次业务需求**：所需筛选、投影、排序、上限，以及是否允许 mutation。

内置参考不会包含业务数据、数据库路径、cursor secret 或 receipt。`schema print` 提供表、字段、ADT variant、主键和索引，避免模型发明 SQL 表或 JSON 字段。

```bash
unionid docs query > unionid-query-context.md
unionid docs query --format json > unionid-query-context.json
unionid schema print --db app.redb --format json > schema.json
```

默认输出是带稳定 front matter 的 Markdown，可直接放入 prompt。JSON 输出适合程序组合，顶层结构为：

```json
{
  "schema_version": 1,
  "software_version": "0.6.0",
  "language_version": "0.7",
  "topic": "query",
  "reference": "# Unionid query language for LLMs\n...",
  "examples": [
    {"name": "adt-query", "description": "...", "source": "enum State { ... }"}
  ]
}
```

version 1 可以增加字段，但不会改变或删除现有字段的含义。`software_version` 表示提供内容的二进制，`language_version` 表示源码语法契约。

## 推荐 prompt 结构

```text
You generate Unionid source, not SQL.

<unionid-reference>
粘贴 unionid docs query 的输出
</unionid-reference>

<database-schema>
粘贴 schema print --format json 的输出
</database-schema>

<request>
从 tasks 中选择仍可重试的任务，按 priority 降序、id 升序排列，最多 20 行。
</request>

Return one canonical .unid operation and no prose.
Do not invent tables, fields, variants, or indexes.
```

参考会明确告诉模型：查询是 PRQL 风格的有序 pipeline；ADT 应使用穷尽 `match`；期望 enum 类型明确时可写 `Pending`，独立或有歧义时写 `State::Pending`；闭包使用 `value -> expression`，不使用 `|value|`；源码不写分号。生成相关存在查询时只使用 `filter exists { from ... }` 或 `filter not exists { from ... }`，以 `outer.path` 引用外层行，并且只能选择 schema 中已有索引支持的目标键；目标路径与外层路径的类型必须兼容。

## 生成后的检查

LLM 输出只是待验证源码。先保存为 `.unid`，再执行：

```bash
unionid fmt --file generated-query.unid
unionid query describe \
  --db app.redb \
  --file generated-query.unid \
  --output generated-query.contract.json
```

`fmt` 显示 canonical form；需要 CI 检查时使用 `fmt --check`。`query describe` 使用当前 parser、binder 和目标数据库 schema 检查字段、参数、variant payload、match coverage、结果类型与 cardinality，但不执行查询。只有检查通过后才使用 `run`、客户端或 prepared API 执行。

mutation 应额外经过人工或应用策略审核，并通过只读环境或数据库副本演练。涉及丢响应重试时使用协议的 idempotency key，不能让模型通过重复执行来猜测上一次 mutation 是否成功。

## 内置示例

JSON bundle 中提供三份规范化、可执行源码：

- `adt-query`：声明 ADT、写入 enum、match、derive、sort 和 projection；
- `nested-values`：嵌套 record、Option、enum payload、List 和箭头闭包；
- `mutation`：同时求值的 typed set、ADT 状态转换和 returning。

源码 checkout 和 release archive 也在 `examples/llm/` 保存同一批 `.unid` 文件。它们由测试实际执行，并检查 formatter 幂等，防止示例与语言实现漂移。

```text
from tasks
filter match state {
  Pending => true
  Running {attempt, ..} => attempt < 3
  _ => false
}
sort {-priority, id}
select {id, title, state}
take 20
```

完整 stage 与表达式语义见[查询](../language/queries)和[查询完整参考](../reference/query-reference)。

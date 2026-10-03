# 语言完整参考

本页描述当前可执行源码，不包含仅存在于设计稿的语法。`.unid` 文件使用 UTF-8、无分号布局；一个文件可以包含多条 schema/DML/query 语句，一个 Engine 请求把整个脚本作为原子单元。

## 词法与布局

- 标识符使用 ASCII 字母、数字和 `_`，首字符不能是数字。
- 类型名和 variant 名以大写字母开头；表、字段、参数和 binding 通常小写。
- `#` 开始行注释；字符串中的 `#`、`|` 和逗号只是文本。
- tab 不能用于缩进。顶层新语句结束前一个 pipeline；空行不结束文件中的语句。
- `{}` 表达 struct、enum、record value、字段集合、match branch、group 与跨行表达式；`[]` 表达 list；`()` 表达 tuple、位置 payload、调用与 precedence。
- 多行 delimiter 按换行分项且不写逗号；紧凑单行形式使用逗号。canonical formatter 固定输出这一布局。
- `|` 只连接紧凑单行 pipeline。局部闭包使用 `value -> expression` 或 `(value: Type) -> expression`，不使用成对竖线。

源码限制为 1 MiB、100,000 tokens、64 层类型/值/表达式/布局嵌套。超限返回 `E_LIMIT`，语法错误携带源码 span。

## 类型声明

```text
type Point = (float, float)

struct Contact {
  email: text
  nickname: Option<text> = None
}

enum State {
  Pending
  Running {
    worker: text
    attempt: int
  }
  Failed(text, bool)
}
```

支持 primitive、命名 record/sum、tuple、`Option<T>`、`List<T>` 与直接自递归命名类型。不支持用户泛型和多类型互递归。

Record default 必须是可在 schema 阶段完全检查的 typed literal。缺少字段时逐层补默认值；显式错误值不会退回 default。没有 default 的 `Option<T>` 字段仍必须显式写 `None`。

## 表、主键与索引

```text
table tasks: Task {
  key id
}

create index tasks (state)

create index tasks (state, -priority, id)

create unique index tasks (owner.email, external_id)
```

表的 row type 必须是 record。主键是 int/text/uuid 等可索引 scalar，拒绝重复；无主键表允许重复 row。

Secondary index 包含 1–16 个字段路径。方向和次序属于索引身份。相同 field tuple 不能同时声明 ordinary 与 unique。unique 比较完整 typed tuple，`None` 不是例外。创建约束前扫描已有行；冲突使 schema、revision 和 index 全部保持不变。

`create unique index <table> (<paths>) if <predicate>` 声明部分唯一索引，只约束 predicate 为 true 的行；predicate 是对当前行的纯 bool 表达式，例如 `is_some email`、`deleted_at == None` 或 `state == Active`。它随 logical backup 与 portable schema 无损携带，需要 storage format 10/11（新库默认 10）。Planner 只在查询的简单 `&&` 过滤机械蕴含 predicate 时使用它，`explain` 输出 `index_predicate`、`predicate_proven` 与 value-free 的 `predicate_rejections`；`fetch_by_key` 不把部分唯一索引当作全表唯一证明。

Planner 可使用连续 equality prefix，加下一个 component 的 range；满足剩余连续前缀的 sort 可正向或整体反向遍历。range 后、key gap 后和 stage 边界后的条件仍作为 residual filter。

## 值语法

```text
{
  id: 1
  tags: ["docs", "release"]
  location: (31.2, 121.5)
  state: Running {worker: "w1", attempt: 2}
}
```

- Record 使用 `field: value`；字段重复、缺失或未知均失败。
- 期望 enum 类型明确时，unit variant 写 `Pending`，record payload 写 `Running {...}`；独立构造或有歧义时写 `State::Pending` / `State::Running {...}`。位置 payload 写 `Pair(1, "x")`。
- `Some(value)` / `None` 对应 option；空 list 与 None 不等价。
- 命名类型保留 nominal identity；匿名同形 record 不能替代命名 record。

## 生产标量

```text
struct Asset {
  id: uuid
  digest: bytes
  day: date
  created_at: timestamp
  ttl: duration
  price: Decimal<18, 2>
}
```

| 类型 | Canonical 规则 |
| --- | --- |
| uuid | 标准 UUID typed string；可做主键 |
| bytes | 小写偶数长度 hex；不接受 base64 猜测 |
| date | `@YYYY-MM-DD`；无本地时间或 calendar 算术 |
| timestamp | 必须包含 `Z` 或 numeric offset |
| duration | 整数精确单位，如 `30seconds` |
| `Decimal<P, S>` | `decimal "19.90"`；P 1..38，S 0..P，不隐式舍入 |

时间转换只能使用显式 `date_parse`、`timestamp_parse`、`duration_parse`。Decimal text 使用 `decimal_parse old P S`，改变 scale/precision 使用 `decimal_rescale old P S`；丢弃非零位返回 `E_DECIMAL_RANGE`。

## Typed map

`Map<text, T>` 字面量写作 `map {"key": value}`，空 map 为 `map {}`。key 必须是 text，重复 key 被拒绝；比较、排序与持久化使用 UTF-8 key 字节的规范顺序，与书写顺序无关。查询函数为 `contains_key`、`get`、`keys`、`values`、`entries` 与 `length`，并可交给有界的 `any`/`all`。map 受条目数、字节与深度预算约束，需要 storage format 8 及以上（新库默认 10）。不支持动态字段路径、map 模式解构、merge、按 key 原地更新或 keyed secondary index。

## 有限递归

```text
enum Tree {
  Leaf(text)
  Branch {
    children: List<Tree>
  }
}
```

递归类型必须可构造至少一个有限值。Sum 需要终止 variant；record/tuple 每个必需成员都要可终止；`None` 与空 list 提供终止路径。`type Loop = Loop` 会在 schema 发布前返回 `E_SCHEMA`。

## 参数与脚本边界

`$name` 由 prepared Rust API 或 versioned protocol 绑定到 AST，不做文本替换。缺少、多余和 wire 解码错误分别返回 `E_PARAM_MISSING`、`E_PARAM_EXTRA`、`E_PARAM_TYPE`；上下文类型不匹配返回 `E_TYPE`。

一次脚本中的 schema、数据和 ledger 变化共享一个候选状态与提交。任一语句失败，之前语句也不发布。DML 后可紧跟 `expect affected <op> <n>`（`== != < <= > >=`，非负整数常量）；不满足时返回 `E_EXPECTATION` 并回滚整个脚本，错误携带从 1 开始的 `statement_index`。守卫位置不合法时在执行前返回 `E_EXPECTATION_CONTEXT`。一个脚本最多 4,096 条顶层语句。ledger 非空后普通脚本不能绕过 migration runner 修改 schema。

## 格式化与输入状态

```bash
unionid fmt --file file.unid
unionid fmt --check schema.unid queries/*.unid
unionid fmt --write schema.unid queries/*.unid
```

formatter 输出固定的无分号布局，保留理解 precedence 所需括号，并保证 parse/format 幂等。REPL 与编辑器可使用同一 parser 驱动的 `complete` / `incomplete` / `invalid` 判断，避免靠空行猜测语句结束。

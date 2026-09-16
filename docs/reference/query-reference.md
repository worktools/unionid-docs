# 查询与表达式完整参考

## Pipeline 结构

```text
from tasks
let threshold = 5
let urgent = (priority: int) -> priority >= threshold
filter archived == false
filter urgent priority
derive label = match state {
  State::Pending => "pending"
  State::Running {worker, ..} => worker
  State::Done {result} => result
  State::Failed {message, ..} => message
}
sort {-priority, id}
select {id, title, state, priority, label}
take 20
```

stage 严格按源码顺序：`filter` 改变 row 集合；`derive` 扩充当前 schema；`select` 改变后续可见字段；`sort` 定义 total order；`take/page` 限制结果。Planner 只跳过前置 `let`，不越过其他 stage 重新排序。

## 表达式

支持字段/嵌套路径、binding、参数、typed literal、constructor、算术、比较、bool operator、Option helper、`contains`、`length`、`any/all` 与非递归局部函数。

```text
filter {
  priority >= $minimum
  && contains tags "release"
  && is_some assignee
  && all attempts (x -> x >= 0)
}
```

混用 `&&`/`||` 必须用括号明确分组。箭头闭包写 `x -> expression` 或 `(x: Type) -> expression`，不使用会与 pipeline `|` 冲突的竖线闭包。Int 算术 checked；float 每个中间结果必须有限；除零、溢出、NaN/Infinity 返回 `E_ARITH`。一个 pipeline/DML target 最多求值 100,000 个 list predicate element。

## Match

```text
filter match state {
  State::Running {attempt, ..} => attempt >= 2
  State::Failed {retryable: true, ..} => true
  _ => false
}
```

Pattern 可递归解构 sum、option、record、tuple 和 list。Binder 在扫描前检查穷尽性、不可达分支和积类型相关性；最多 100,000 analysis steps。`_` 是 catch-all，`..` 忽略 record 剩余字段。

`derive x = match source {...}` 构造任意目标 typed value。Mutation 的 `set field = match source` 使用同一 IR；顶层 `current => current` 可保留完整旧值。

## Select 与 derive

```text
derive {
  subtotal = price + tax
  has_owner = is_some owner
}
select {
  id
  display = title
  total = subtotal + shipping
}
```

字段顺序即响应列顺序。重复或未知字段即使空表也失败。Computed select 仍经过完整静态类型检查。

## Sort 与 take

```text
sort {-priority, created_at, id}
take 20
take 11..21
take 11..=20
```

全部 typed value 共享 total order：sum 先 variant ID 再 payload，record 按 field ID，`None < Some`，list 做短前缀优先的词典序比较。相同 sort keys 的行无稳定顺序保证；需要稳定结果时以主键收尾。

`take N` 接受非负整数。范围使用一基 Rust 语义：`11..21` 是半开区间，`11..=20` 包含末端；两者都跳过前 10 行并最多取 10 行。

## Aggregate

```text
from tasks
group {owner, state} {
  aggregate {
    count = count
    total = sum estimate
    min_priority = min priority
    max_priority = max priority
  }
}
filter count > 0
sort {-count, owner}
```

未分组 `aggregate` 与 `group ... { aggregate {...} }` 支持 count/sum/min/max。`count` 空输入为 0，`sum` 使用输入数值类型的零，min/max 返回 `Option<T>`。Group key 可为完整 ADT，未 sort 时不承诺组顺序。

限制：最多 256 aggregate 输出、100,000 groups、1,000,000 accumulator cells、64 MiB 估算 group state、250,000 working rows、100,000 result rows。超限返回 `E_LIMIT`。

## 有界 lookup

```text
from orders
filter tenant == $tenant
sort id
page 100
lookup lines from order_lines on order_id == id take 100
select {id, customer, lines}
```

目标 key 必须是主键、单列 index 或 composite index 第一项，并与 driver key 同型。每个 driver 的 `take` 为 1..=1000 的硬上限；读到 `take + 1` 即返回 `E_RELATION_LIMIT`。一个 lookup 最多接收 10,000 driver rows。无匹配结果为 `[]`。

Page 后只允许 lookup 与 select。多个 lookup 可顺序组合，但不遍历前一层 list 内部。Lookup 不支持 mutation target，也没有目标侧自定义 sort。

## Keyset page

```text
from jobs
filter archived == false
sort {-priority, id}
page 100 after "u1.payload.mac"
```

limit 1..=1000，最多 16 sort keys。最终顺序必须由主键收尾，或由 equality-fixed prefix + 完整 unique-index suffix 证明唯一。Cursor 最多 8192 bytes，payload 最多 6144 bytes；HMAC 绑定 database identity、schema、canonical query、typed params、direction、limit、sequence 和 boundary tuple。

成功 mutation 推进 sequence 并使旧 cursor 返回 `E_CURSOR_STALE`；失败/回滚、read 和 idempotent replay 不推进。Restore 轮换 database/cursor identity。

## Explain 与运行画像

`explain` 返回 access kind、索引 lookup、当前 candidate 数、源码 stage 顺序和结果 schema，不执行 row。`explain analyze` 执行普通查询路径但不返回业务值，增加 prepare/plan/execute 耗时、returned/examined/decoded rows、index entry、redb cache、batch 和 working-memory peak。

## 通用资源边界

查询源码 1 MiB / 100,000 tokens / 64 层；working rows 250,000；结果 100,000 rows；服务 response 16 MiB；默认服务 deadline 25 秒。排序、group、match、局部函数和集合 predicate 还有各自预算。应通过 indexed filter、较小 page/batch 和更早 projection 控制工作量，而不是依赖提高无界上限。

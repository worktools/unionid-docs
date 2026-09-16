# 查询：从 pipeline 到稳定分页

查询从 `from` 开始，stage 按源码顺序执行。planner 只在不改变语义时使用主键或 secondary index，不会越过 stage 边界重排逻辑。

## 基础 pipeline

```text
from tasks
filter priority >= 5
derive urgent = priority >= 8
sort {-priority, id}
select {id, title, state, urgent}
take 20
```

常用 stage 包括 `filter`、`derive`、`select`、`sort`、`take`、`page`、`group` 与 `aggregate`。

## Match ADT

```text
from tasks
filter match state {
  State::Running {attempt, ..} => attempt >= 2
  State::Failed {retryable, ..} => retryable
  _ => false
}
derive state_label = match state {
  State::Pending => "pending"
  State::Running {worker, ..} => worker
  State::Done {result} => result
  State::Failed {message, ..} => message
}
```

match 在扫描前检查类型、穷尽性和不可达分支。pattern 可递归解构 sum、option、record、tuple 与 list；预算防止 pattern matrix 或展开失控。

## 局部 let 与纯函数

```text
from tasks
let threshold = 5
let is_urgent = (priority: int) -> priority >= threshold
filter is_urgent priority
```

局部函数使用箭头闭包，是非递归纯函数，并在有限预算内推断与展开。单参数可写 `value -> expression`，多参数写 `(left: T, right: U) -> expression`；不使用 `|value|`。它们不能访问时钟、网络或可变全局状态。

## 聚合

```text
from tasks
group state {
  aggregate {
    count = count
    max_priority = max priority
  }
}
sort state
```

支持 `count/sum/min/max`、typed 空输入、完整 ADT key，并限制 group、accumulator cell 和估算工作内存。

## Lookup 与分页

有界 lookup 把目标表的完整 typed row 放进当前行的 list 字段，适合订单/明细等一对多读取：

```text
from orders
sort id
page 100
lookup lines from order_lines on order_id == id take 100
select {id, customer, lines}
```

`on` 左侧属于目标表，右侧属于当前 pipeline；类型必须相同，目标字段必须是主键、二级索引或复合索引第一项。末尾 `take` 是 1..=1000 的逐行硬上限，超出返回 `E_RELATION_LIMIT`，不会静默截断。稳定分页时 lookup 放在 page 后面。它不是通用 SQL join，也不能用于 mutation target。

跨请求稳定分页使用唯一 keyset 顺序：

```text
from tasks
sort {-priority, id}
page 100
```

排序必须以主键收尾，或由 equality-fixed prefix 加完整 unique-index suffix 证明唯一。cursor 由服务签名并绑定 database identity、schema、sequence、query、params 与 page size；任意成功写入会使旧 cursor 在扫描前过期。

继续向后读取使用 `page 100 after "u1.payload.mac"`，返回上一页使用 `before`。limit 为 1..=1000；page 不与 take、group、aggregate 或 mutation 混用。

## Explain

```text
explain
  from tasks
  filter id == 1

explain analyze
  from tasks
  filter state == State::Pending
  take 20
```

`explain` 只绑定和规划；`explain analyze` 在同一不可变读快照上执行，但不返回业务 rows、参数或 cursor，只返回实际耗时、examined/decoded rows、索引 entry、批次与工作内存峰值。

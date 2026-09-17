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

常用 stage 包括 `filter`、`derive`、`select`、`sort`、`take`、`page`、`group`、`aggregate` 与 `window`。

## Match ADT

```text
from tasks
filter match state {
  Running {attempt, ..} => attempt >= 2
  Failed {retryable, ..} => retryable
  _ => false
}
derive state_label = match state {
  Pending => "pending"
  Running {worker, ..} => worker
  Done {result} => result
  Failed {message, ..} => message
}
```

match 在扫描前检查类型、穷尽性和不可达分支。scrutinee 已确定 enum 类型，因此分支可省略 `State::`；需要消歧时仍可写完整限定名。pattern 可递归解构 sum、option、record、tuple 与 list；预算防止 pattern matrix 或展开失控。

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

支持 `count/count_distinct/avg/sum/min/max`、typed 空输入、完整 ADT key，并限制 group、accumulator cell 和估算工作内存。

`count_distinct` 按完整 typed value 去重，因此 enum constructor、payload、record、option 与 list 内容都会参与比较。`avg int` 返回 `Option<float>`；`avg float` 与 `avg duration` 保留输入的命名类型，空输入返回 `None`。decimal 的平均值仍会被拒绝，直到精度与舍入规则确定。

## 基础排名窗口

`window` 保留输入行，并追加命名的 `int` 排名字段。`partition` 可省略，`sort` 必须明确给出：

```text
from tasks
window {
  partition queue
  sort {-priority, created_at}
  position = row_number
  placing = rank
  dense = dense_rank
}
filter position <= 3
sort {queue, position}
```

`row_number` 为每个分区生成连续位置；`rank` 让并列值共享名次并留下空缺；`dense_rank` 不留空缺。partition 使用完整 typed equality，sort 使用与普通 `sort` 相同的 typed total order。window 自身不会重排输出行；如果 `row_number` 需要跨恢复稳定，应在 window sort 末尾加入主键。

窗口 stage 受 250,000 working rows、64 MiB working state 和最多 256 个输出字段限制。当前不支持 frame、`lag`、`lead`、窗口 aggregate 或与 cursor `page` 组合。

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

只需要判断是否存在匹配子项时使用有界相关 exists：

```text
from tasks
filter exists {
  from task_items
  filter task_id == outer.id
  filter state != Done
}
```

内层普通路径属于目标表，`outer.id` 显式引用当前外层行。至少一个类型一致的相关等值目标必须是索引首项。首版内层只允许 filter，最多接受 10,000 个 driver rows，并在首个匹配处停止。

使用相同内层 pipeline 的 `filter not exists { ... }` 可保留没有匹配目标行的 driver，包括完全没有子项，或所有子项都未通过 residual filters 的情况。目前仍不支持嵌套 `exists`、mutation target，以及其他内层 stage。

```text
from tasks
filter not exists {
  from task_items
  filter task_id == outer.id
  filter state != Done
}
```

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
  filter state == Pending
  take 20
```

`explain` 只绑定和规划；`explain analyze` 在同一不可变读快照上执行，但不返回业务 rows、参数或 cursor，只返回实际耗时、examined/decoded rows、索引 entry、批次与工作内存峰值。

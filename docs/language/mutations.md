# 写入：原子 DML 与 typed returning

## Insert 与批量写入

```text
insert tasks {
  id: 1
  owner: Contact {email: "alice@example.com"}
  state: Pending
  tags: ["docs"]
  title: "ship docs"
}
returning {id, state}
```

批量操作必须写 `many`：

```text
insert many tasks $rows
returning {id, state}
```

`$rows` 的绑定类型是 `List<Task>`。每行补齐默认值后，整批检查主键、unique index、预算和 deadline；任何一项失败都不会留下部分行。单批最多 100,000 行。

## Upsert

```text
upsert tasks $row
returning
```

upsert 要求主键。命中时完整替换 typed row 并保留 RowId；未命中时分配新 RowId。`upsert many` 拒绝输入 list 中重复主键，不采用 first/last wins；响应按输入顺序给出 action。

## Update 与 delete pipeline

```text
update tasks
filter match state {
  Pending => true
  _ => false
}
sort {-priority, id}
take 10
set state = Running {attempt: 1, worker: "worker-1"}
returning {id, state}
```

```text
delete tasks
filter state == Done {result: "expired"}
sort id
take 100
returning id
```

target 可按源码顺序组合 filter、match、sort 和 take。多个 `set` 同时基于旧行求值，不会按书写顺序互相读取；嵌套 record path、主键与索引在同一个原子请求内维护。

## 业务守卫 `expect`

在 DML 后紧跟一条 `expect affected <op> <n>`，检查上一条 insert、insert many、upsert、upsert many、update 或 delete 实际影响的行数。比较符支持 `== != < <= > >=`，右侧必须是非负整数常量：

```text
update accounts
filter id == $from && balance >= $amount
set balance = balance - $amount
expect affected == 1

update accounts
filter id == $to
set balance = balance + $amount
expect affected == 1
```

任何一条守卫不满足时返回 `E_EXPECTATION`，整个脚本确定回滚，包括前面已经执行的写入、索引、RowId 分配与新回执。错误带从 1 开始的 `statement_index` 和源码 span，守卫本身也计入语句序号。余额不足、收款人不存在或版本过期都可以用这种方式表达。没有守卫的零行写入仍然合法。

守卫必须紧跟一条 DML；空行和注释不打断相邻关系，查询、DDL 或第二个 expect 会打断，此时在执行前返回 `E_EXPECTATION_CONTEXT`。成功响应带按源码顺序排列的 `statements` 元数据（`index`、`kind` 与可选的 `affected_rows`）；尾随守卫保留上一条 DML 的 returning 结果。一个脚本最多 4,096 条顶层语句、512 KiB 摘要，大量导入用 `insert many`。静态绑定和 `queries!` 宏只接受“一条 DML 加尾随守卫”，多条写入请使用 Engine/prepare、CLI、TCP 或 HTTP。守卫只检查行数，不替代完整的领域规则；旧 WAL 模式会以 `E_CONFIG` 拒绝带守卫的脚本。

## 原子脚本与失败

每次 Engine、CLI 或协议请求是一个原子脚本。parse、bind、算术、约束、预算、deadline 或持久化提交前失败都会回滚候选状态。redb commit 返回错误时结果可能不确定，Engine 会关闭句柄；调用方必须重开并运行 `check`，不能盲目重试。

需要网络重试的 mutation 应使用幂等 key：同一 key 和 canonical digest 重放原响应，不同 digest 冲突。只有确定发生在事务 commit 前的失败才保证不占 key；commit 返回错误时结果不确定，key 与 receipt 可能已经持久化，调用方必须重开并以完全相同的请求和 key 重试或检查。数据效果与 receipt 在同一事务提交。

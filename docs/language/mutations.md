# 写入：原子 DML 与 typed returning

## Insert 与批量写入

```text
insert tasks {
  id = 1,
  title = "ship docs",
  owner = {email = "alice@example.com"},
  tags = ["docs"],
  state = Pending,
}
returning {id, state}
```

批量操作必须写 `many`：

```text
insert many tasks $rows
returning {id, state}
```

`$rows` 的绑定类型是 `list Task`。每行补齐默认值后，整批检查主键、unique index、预算和 deadline；任何一项失败都不会留下部分行。单批最多 100,000 行。

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
  Pending => true,
  _ => false,
}
sort {-priority, id}
take 10
set state = Running {worker = "worker-1", attempt = 1}
returning {id, state}
```

```text
delete tasks
filter state == Done {result = "expired"}
sort id
take 100
returning {id}
```

target 可按源码顺序组合 filter、match、sort 和 take。多个 `set` 同时基于旧行求值，不会按书写顺序互相读取；嵌套 record path、主键与索引在同一个原子请求内维护。

## 原子脚本与失败

每次 Engine、CLI 或协议请求是一个原子脚本。parse、bind、算术、约束、预算、deadline 或持久化提交前失败都会回滚候选状态。redb commit 返回错误时结果可能不确定，Engine 会关闭句柄；调用方必须重开并运行 `check`，不能盲目重试。

需要网络重试的 mutation 应使用幂等 key：同一 key 和 canonical digest 重放原响应，不同 digest 冲突。只有确定发生在事务 commit 前的失败才保证不占 key；commit 返回错误时结果不确定，key 与 receipt 可能已经持久化，调用方必须重开并以完全相同的请求和 key 重试或检查。数据效果与 receipt 在同一事务提交。

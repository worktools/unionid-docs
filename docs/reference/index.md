# 语言概览

unionid 源码不使用分号。声明与查询优先使用空格、换行和缩进；复杂布尔表达式使用括号明确分组。

## 声明类型与表

```text
type State =
  Pending
  | Running {worker text, attempt int}
  | Done {result text}

type Task = {
  id int,
  title text,
  tags list text,
  state State,
}

table tasks Task
  key id
```

## 写入 typed value

```text
insert tasks {
  id = 1,
  title = "sync directory",
  tags = ["sync", "local"],
  state = Running {worker = "worker-1", attempt = 2},
}
```

## 组合查询 stage

```text
from tasks
filter match state {
  Running {attempt, ..} => attempt >= 2,
  _ => false,
}
derive state_label = match state {
  Pending => "pending",
  Running {worker, ..} => worker,
  Done {result} => result,
}
select {id, title, state_label}
sort id
take 20
```

常用 stage 包括 `filter`、`select`、`derive`、`sort`、`take`、`page`、`group` 与 `aggregate`。

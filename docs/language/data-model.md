# 数据模型：让非法状态不可表示

unionid 的 schema 由积类型（record/tuple）与和类型（sum）组成。命名类型具有身份：即使两个类型形状相同，也不能互换。

## Record 与 sum

```text
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
  Done {
    result: text
  }
  Failed {
    message: text
    retryable: bool
  }
}

struct Task {
  id: int
  title: text
  owner: Contact
  tags: List<text> = []
  state: State
  priority: int = 0
}

table tasks: Task {
  key id
}
```

没有默认值的字段必须提供，即使类型是 `Option<T>` 也要明确写 `None`。默认值在 schema 建立时类型检查，只能是纯 typed literal，不能引用字段、参数、时钟或函数。

## 值与构造器

```text
insert tasks {
  id: 1
  owner: Contact {email: "alice@example.com"}
  state: Running {attempt: 2, worker: "local"}
  title: "ship docs"
}
```

列表写作 `[1, 2]`，tuple 写作 `(1, "x")`，位置 payload 写作 `Pair(1, "x")`。期望 enum 类型明确时可写 `Pending` 或 `Running {...}`；独立构造或有歧义时用 `State::Pending` 限定 constructor。

## 主键与索引

主键必须是可索引 scalar，UUID 可以直接作为生产 ID。无主键的表允许重复行。

```text
create index tasks (state)

create unique index tasks (owner.email)

create index tasks (state, -priority, id)
```

索引可包含 1–16 个嵌套字段路径，方向和顺序属于索引身份。unique 对完整 typed value 生效，`None` 也是一个普通值。添加 unique index 会预检已有行，任何冲突都会原子回滚。

## 有限递归 ADT

```text
enum Tree {
  Leaf(text)
  Branch {
    label: text
    children: List<Tree>
  }
}

struct Chain {
  value: int
  next: Option<Chain> = None
}
```

直接自递归必须存在终止路径；`Option<T>` 的 `None` 与空 list 可以终止。互递归、纯别名循环、共享对象图与循环引用不支持。值是深度不超过 64 的有限树。

## 稳定身份

类型、字段、variant、表和索引拥有永不复用的 catalog ID。rename 保留 ID，drop 后同名重建会获得新 ID。业务主键与内部 RowId 是不同概念；删除后的 RowId 不复用。

继续阅读[标量与表达式](./scalars)或直接进入[查询](./queries)。

# Language overview

unionid source uses no semicolons. Declarations and queries favor spaces, line breaks, and indentation; complex boolean expressions use parentheses to make grouping explicit.

## Declare types and tables

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

## Insert a typed value

```text
insert tasks {
  id = 1,
  title = "sync directory",
  tags = ["sync", "local"],
  state = Running {worker = "worker-1", attempt = 2},
}
```

## Compose query stages

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

Common stages include `filter`, `select`, `derive`, `sort`, `take`, `page`, `group`, and `aggregate`.

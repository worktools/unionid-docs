# 语言导览

unionid 使用无分号、偏 PRQL 风格的脚本语言。一个请求可以包含 schema、写入或查询，并作为原子脚本执行。

```text
from tasks
filter priority >= 5
derive urgent = priority >= 8
sort {-priority, id}
select {id, title, state, urgent}
take 20
```

## 学习地图

- [数据模型](./data-model)：命名 struct/enum、tuple、`Option<T>`/`List<T>`、默认值、递归 ADT。
- [标量与表达式](./scalars)：生产标量、算术、集合 helper、时间与 decimal 边界。
- [查询](./queries)：pipeline、match、derive、aggregate、lookup、分页、explain。
- [写入](./mutations)：insert/upsert/update/delete、批量操作、returning、原子性。

## 语法原则

- 类型名与 variant 名以大写字母开头；标识符使用 ASCII 字母、数字和下划线。
- `{}` 表达 struct、enum、record value、字段集、match branches、group 和复杂表达式；`[]` 表达 list；`()` 表达 precedence、tuple、位置 payload 和调用。
- 多行结构按换行分项且不写逗号；紧凑单行结构使用逗号。formatter 输出这一套 canonical 布局。
- bool operator 使用 `!`、`&&`、`||`；混用 `&&` 与 `||` 时用括号明确分组。
- 字段、match、set 等上下文已确定 enum 类型时可写 `Pending` / `Running {...}`；独立构造或有歧义时写 `State::Pending` / `State::Running {...}`。
- 局部闭包写 `value -> expression` 或 `(value: Type) -> expression`。`|` 只连接单行 pipeline，不用作闭包边界。
- 每个请求有解析、绑定和执行边界；类型、参数和 DML 目标在扫描前确定。

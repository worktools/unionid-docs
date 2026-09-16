# 语言导览

unionid 使用无分号、偏 PRQL 风格的脚本语言。一个请求可以包含 schema、写入或查询，并作为原子脚本执行。

```text
from tasks
filter priority >= 5
derive urgent = priority >= 8
select {id, title, state, urgent}
sort {-priority, id}
take 20
```

## 学习地图

- [数据模型](./data-model)：命名 record/sum、tuple、option/list、默认值、递归 ADT。
- [标量与表达式](./scalars)：生产标量、算术、集合 helper、时间与 decimal 边界。
- [查询](./queries)：pipeline、match、derive、aggregate、lookup、分页、explain。
- [写入](./mutations)：insert/upsert/update/delete、批量操作、returning、原子性。

## 语法原则

- 类型名与 variant 名以大写字母开头；标识符使用 ASCII 字母、数字和下划线。
- `{}` 表达 record、字段集、match branches 和多项 sort；`[]` 表达 list；`()` 表达 precedence、tuple 和函数调用。
- delimiter 内项目用逗号分隔；formatter 保留 trailing comma。
- 混用 `and` 与 `or` 时必须用括号明确分组。
- 每个请求有解析、绑定和执行边界；类型、参数和 DML 目标在扫描前确定。

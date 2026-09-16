# 标量与表达式

## 标量表

| 类型 | 源码表示 | 关键规则 |
| --- | --- | --- |
| `int` | `42` | signed i64，checked 算术 |
| `float` | `3.5` | 仅有限 f64，拒绝 NaN/Infinity |
| `bool` | `true` | 可由比较和 helper 产生 |
| `text` | `"hello"` | UTF-8 |
| `uuid` | typed string | 可作主键与索引 |
| `bytes` | typed hex string | 小写、偶数长度 |
| `date` | `@2026-09-08` | 无隐式本地时区或 calendar 算术 |
| `timestamp` | 带 `Z` 或 offset | 精确时间点 |
| `duration` | `30seconds` | 整数精确单位 |
| `decimal P S` | `decimal "19.90"` | precision 1..38，不隐式舍入 |

## 算术

`int`、`float`、duration 和同类型 decimal 支持 checked 运算；溢出、除零或非有限 float 返回 `E_ARITH`。decimal 当前支持加、减、负号和 sum，不支持乘除、avg 或舍入。

```text
derive total = price + tax
filter retry_after <= 30seconds
derive expires_at = created_at + ttl
```

`timestamp - timestamp` 得到 duration。`date` 不读取当前时间、不隐式使用系统时区，也不执行月份/闰年式 calendar 运算。

## Bool 与集合 helper

```text
filter {
  priority >= 5
  && contains tags "release"
  && is_some assignee
}
```

可用比较、`!`、`&&`、`||`、`contains`、`length`、Option helper，以及有预算的 `any/all`。复杂表达式可用 `{}` 跨行；需要改变 precedence 时使用 `()`。集合 predicate 使用 `value -> expression`，不用竖线闭包。

## 索引大小边界

被主键、普通或 unique index 覆盖的 bytes leaf 最大 8192 octets，完整持久索引 key 最大 64 KiB；普通 value 上限为 16 MiB。超限写入、migration 或 restore 返回明确错误并原子回滚。

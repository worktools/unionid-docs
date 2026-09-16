# 版本与兼容性

## 四种独立版本

| 版本 | 作用 |
| --- | --- |
| unionid binary | 命令、语言与实现能力 |
| storage/component codec | redb 文件内部格式 |
| protocol | wire value 与 request/response |
| schema revision/hash | 单个数据库的应用结构 |

不要从其中一个推断另一个。使用 `unionid version --format json` 查看 binary contract；使用 REPL 的 `.storage` 命令或 `unionid doctor --db <db> --format json` 查看实际数据库。

## Schema identity

revision 是同一数据库内的单调快速失效标记；hash 是稳定 ID 排序后的 schema manifest SHA-256。相同文本在两个独立数据库里不保证相同 catalog ID lineage。

新增带默认值字段通常对旧读取兼容；新增 sum variant 会让旧穷尽 match 失效；rename 保留 identity 但源码名称不兼容；类型变更、删除或收紧约束需要显式转换和全量预检。

## 源码语言

Rust 风格语法是面向 v0.7 的源码 breaking change：`struct`/`enum`、`name: Type`、`Option<T>`/`List<T>`、`Type::Variant`、`field: value` 与 `!`/`&&`/`||` 是 canonical 形式。闭包继续使用 `value -> expression`，不使用 `|value|`。parser 在 pre-1.0 期间继续读取旧形式以恢复 WAL、migration ledger 和既有脚本，但 formatter 只输出新形式。

`take start..end` 现在是半开区间，`take start..=end` 才包含末端。旧源码需要人工检查范围；其他语法可先用对应版本的 `unionid fmt` 迁移，再提交格式化结果和重新生成的 binding digest。

## Protocol

v1 支持基础 scalar/ADT；v2 支持生产 scalar。server 对未知版本和有损表示明确失败。stream protocol 单独版本化。

## Storage

当前 binary 只承诺读取 release contract 列出的格式。启用 incremental backup 会显式进入 format 7；旧 binary 将拒绝打开。logical backup/restore 是跨内部格式和回退验证的首选边界。

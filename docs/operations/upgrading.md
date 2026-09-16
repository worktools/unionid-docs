# 升级 unionid

二进制版本、storage format、component codec、protocol 和应用 schema 分开演进。升级二进制不会自动应用 schema migration，读取新 schema 也不会隐式改写数据库。

## 升级前

1. 保存旧二进制的 `version --format json` 与 `doctor --db ... --format json`。
2. 运行 `check`，创建并实际 restore 验证 logical backup。
3. 保留旧 binary、release archive 和 checksum。
4. 在静止数据库副本上执行新 binary 的 doctor、check、migration plan 与业务读写。

## 显式格式升级

只有 release contract 声明可读当前格式时才能打开生产文件。格式转换必须逐级、显式执行，例如旧 format 1 路径：

```bash
cp app.redb rehearsal.redb
unionid doctor --db rehearsal.redb --format json
unionid upgrade --db rehearsal.redb --target 4
unionid upgrade --db rehearsal.redb --target 5
unionid upgrade --db rehearsal.redb --target 6
unionid check --db rehearsal.redb
```

没有原地 downgrade。回退旧 binary 依赖升级前 backup，restore 到它支持的新路径。

## `.uid` 到 `.unid`

当前兼容窗口同时接受两者，canonical 后缀是 `.unid`。migration checksum 不含路径，安全重命名不会改变 ledger。先 dry-run 批量迁移，再更新脚本和生成命令，最后确认 `migration status` 不变。

## v0.7 源码语法迁移

先在独立分支运行新版 `unionid fmt`，审查 `struct`/`enum`、冒号字段、`Type::Variant` 和 bool operator 的变化。闭包仍写 `value -> expression`。`take start..end` 已改为 Rust 半开区间，formatter 无法推断旧查询是否要保留包含末端的结果；需要时手工改为 `take start..=end`。完成后运行 `project check`，并重新生成静态 query binding 与 digest。

## 生成客户端

使用静态 query binding 的应用在升级后应重新运行 `query rust`，提交新生成物与 digest，并重新编译。protocol v1 保持基础值兼容；生产 scalar 需要 v2。

# Schema migration

## 不可变线性历史

每个 migration 包含 ID、可选 parent、内容 checksum 和应用后的 schema identity。ledger 必须是单链；已应用文件内容不可改变，分叉会被拒绝。

```text
migration task_state_v2 {
  parent task_state_v1
  rename variant State::Failed to Rejected
  change variant State::Rejected to {code: int, message: text} using old -> {code: 0, message: old.message}
}
```

rename 保留稳定 ID；drop 后重建同名对象不会。字段类型、variant payload 和破坏性删除必须使用明确转换，不能由 diff 猜测。

## 从目标 schema 生成草稿

```bash
unionid schema check --file schema.unid
unionid migration diff --db app.redb \
  --schema schema.unid --name task_state_v2
unionid migration plan --db app.redb --dir migrations
```

diff 可直接生成确定性的 add/default/key/index 操作，也会为 type、table、field、variant 和 index 的删除生成带 destructive 标记的 drop。数据对象的 drop 明确丢弃现有数据，不能理解为“安全”，必须人工评审影响后再 plan/apply；疑似 rename、required 回填、类型或 payload 转换和重排会留下非法 `todo`，必须补成显式 rename、`using old -> ...` 转换或其他操作。

## 预检已保存的查询

schema 变化可能让已保存的查询在运行时才出错。`--queries` 让 plan、rehearse 和 apply 在目标 schema 上静态绑定一个查询目录，不执行查询，也不需要运行参数：

```bash
unionid migration plan --db app.redb --dir migrations --queries queries --format json
unionid migration rehearse --db app.redb --dir migrations --queries queries --format json
unionid migration apply --db app.redb --dir migrations --queries queries --format json
```

`queries/` 必须存在且非空，递归加载 `.unid` 文件；每个文件是一条可静态描述的查询或 DML（可带尾随 `expect`）。没有待执行 migration 时也会检查。任一查询在最终 schema 上无效时，命令返回 `E_MIGRATION`（退出码 3），具体文件与错误在 `query_validation.files[].failures` 中；`apply` 在第一次提交前失败，新库不会被创建。预检通过不保证数据转换成功，后续 migration 文件失败仍可能保留前面已提交的文件，可用 `query_validation.valid` 区分两种失败。

`plan` 与 `rehearse` 都在锁定后创建的临时副本上运行，不改变源库字节；`rehearse --copy <path>` 可保留演练副本。预检只覆盖你提供的目录，不会自动发现客户端源码；生成的 Rust binding 仍绑定精确 schema hash，部署前需要重新生成。Rust 调用方可使用 `Engine::plan_migrations_with_queries` 与 `apply_migrations_with_queries`。

## 应用与恢复

```bash
unionid backup --db app.redb --output before.backup.json
unionid migration apply --db app.redb --dir migrations --queries queries
unionid check --db app.redb
unionid migration status --db app.redb --dir migrations
```

format 6 及之后的数据库使用可恢复 shadow generation 分段构建并原子 cutover。期间读取继续使用旧 generation，普通写入被拒绝。中断后使用完全相同文件继续：

```bash
unionid migration advance --db app.redb --dir migrations \
  --max-steps 4 --step-delay-ms 250 --format json
```

重复执行直到 `complete: true`。确认放弃未 cutover 的目标时使用 `migration abort`。没有隐式 down migration；回退使用备份还原或新的前向 migration。

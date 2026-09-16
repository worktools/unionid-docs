# Schema migration

## 不可变线性历史

每个 migration 包含 ID、可选 parent、内容 checksum 和应用后的 schema identity。ledger 必须是单链；已应用文件内容不可改变，分叉会被拒绝。

```text
migration task_state_v2
  parent task_state_v1

  rename variant State.Failed to Rejected

  change variant State.Rejected to {code int, message text}
    using old -> {code = 0, message = old.message}
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

## 应用与恢复

```bash
unionid backup --db app.redb --output before.backup.json
unionid migration apply --db app.redb --dir migrations
unionid check --db app.redb
unionid migration status --db app.redb --dir migrations
```

format 6 使用可恢复 shadow generation 分段构建并原子 cutover。期间读取继续使用旧 generation，普通写入被拒绝。中断后使用完全相同文件继续：

```bash
unionid migration advance --db app.redb --dir migrations \
  --max-steps 4 --step-delay-ms 250 --format json
```

重复执行直到 `complete: true`。确认放弃未 cutover 的目标时使用 `migration abort`。没有隐式 down migration；回退使用备份还原或新的前向 migration。

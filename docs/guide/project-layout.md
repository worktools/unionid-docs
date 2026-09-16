# 项目结构与开发循环

`unionid init <name>` 生成的是可独立版本控制的数据库项目。建议把 schema、migration 和 query 与应用源码一起提交，把 redb 文件和 backup 作为受控运行数据管理。

```text
tasks/
├── schema.unid
├── migrations/
│   └── 0001_initial.unid
├── queries/
│   └── list_running.unid
├── seed.unid
└── data/                 # 通常不提交
```

## 日常修改顺序

1. 修改 `schema.unid` 表达目标结构。
2. 用 `migration diff` 生成草稿。
3. 补全 rename 或 `using old -> ...` 数据转换，不保留任何 `todo`。
4. 运行 `project check`、`migration plan` 和应用查询。
5. 在副本上备份、应用、检查，再进入生产维护窗口。

```bash
unionid schema check --file schema.unid
unionid migration diff --db data/tasks.redb \
  --schema schema.unid --name add_priority
unionid project check --dir .
unionid migration plan --db data/tasks.redb --dir migrations
```

## 文件约定

`.unid` 是 canonical 后缀。`.uid` 在 v1.0.0 前的兼容窗口内仍可读取，但会产生弃用提示。migration checksum 只基于内容，重命名后缀不会让已应用 migration 重跑。

source 不使用分号。`unionid fmt` 输出固定布局；CI 建议运行：

```bash
unionid fmt --check --file schema.unid
unionid project check --dir .
```

## schema、migration 与数据库的关系

- `schema.unid` 是期望状态，可以修改。
- migration 文件是不可变执行历史；应用后不要修改内容或 parent。
- 数据库 catalog 保存稳定 ID、revision、hash 与 migration ledger。
- 读取目标 schema 不会自动迁移数据库，升级二进制也不会自动改变应用 schema。

准备好数据模型后，继续阅读[类型与值](/language/data-model)。

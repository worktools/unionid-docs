# 快速开始

需要 Rust 1.94 或更高版本。安装后，可以在任意空目录完成首用流程，不需要 clone 源码仓库。

## 安装

```bash
cargo install unionid --locked
```

确认当前 shell 使用的版本：

```bash
unionid version --format json
unionid doctor --format json
```

这两条命令不会创建数据库。

## 创建项目

```bash
unionid init tasks
cd tasks
unionid project check --dir .
```

生成的项目包含 ADT schema、初始 migration、seed 和 typed query。`project check` 会依次检查 schema、migrations 与 queries，但不会创建数据库。

## 建库并查询

```bash
unionid migration apply --db data/tasks.redb --dir migrations
unionid run --db data/tasks.redb --file seed.unid
unionid run --db data/tasks.redb --file queries/list_running.unid
```

最后一条命令会从新进程重新打开 redb，并返回 seed 中的 `Running` task。

## 检查数据库

```bash
unionid doctor --db data/tasks.redb --format json
unionid check --db data/tasks.redb
```

`doctor` 诊断一个私有临时副本；`check` 验证原数据库、catalog、typed rows、索引和 migration ledger。

下一步可查看[语言概览](/reference/)。

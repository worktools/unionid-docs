# redb 存储与故障语义

## 打开数据库

```bash
unionid run --db app.redb --file query.unid
unionid server --db app.redb --addr 127.0.0.1:7878
unionid check --db app.redb
```

同一文件只允许一个可写所有者；跨进程冲突返回 `E_BUSY`。只读实例通过 `--read-only` 或 `Engine::open_redb_read_only` 打开。

## 提交结果分类

- commit 前失败：明确回滚，可以在修正输入后重试；
- commit 成功：数据、索引、schema/ledger 和 receipt 原子可见；
- commit 返回错误：结果不确定，Engine 关闭句柄并阻止继续写。

结果不确定时必须重开并运行 `check --db`，再根据业务主键或幂等 receipt 判断效果。不要把它当作普通失败直接重放。

## 稳定身份与增量提交

row 使用表内单调 `u64` RowId，删除形成缺口且不复用。普通 mutation 使用 persistent row/index/receipt roots，提交只写变化的 stable key；DDL、migration、upgrade、restore 与 receipt prune 会走明确的 full rebuild 或 maintenance 路径。

## Storage format 与 schema

storage format、component codec、协议版本和应用 schema revision 是独立版本。新二进制只打开它明确声明可读的格式；遇到未知版本会在修改文件前失败。

## 容量边界

10k 是当前舒适范围。100k 写入、migration 和完整检查经过测试，但延迟与内存明显增大，只作为上限。大表 maintenance 前应使用生产副本测量 open、check、backup、migration 与 peak RSS。

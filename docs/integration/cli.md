# CLI 与 REPL

## 执行脚本

```bash
unionid run --db app.redb --file query.unid
unionid run --db app.redb 'from tasks | take 10'
unionid run --db app.redb --read-only --file report.unid
```

`--read-only` 在完整 parse/bind 后、创建候选状态或持久事务前拒绝 mutation。它是执行边界，不替代文件权限。

## 本地与 TCP REPL

```bash
unionid cli --db app.redb
unionid server --db app.redb --addr 127.0.0.1:7878
unionid cli --addr 127.0.0.1:7878
```

REPL 使用 parser 驱动的 complete/incomplete/invalid 状态，跨行括号与缩进块不会因空行意外提交。它支持关键字和当前 catalog 补全，以及可关闭、可配置路径的安全历史。

内置命令：

- `.tables`：表、row type、主键与 row count；
- `.types`：命名类型；
- `.schema`：revision、hash 与 canonical schema；
- `.storage`：storage format、codec、read-only 与 receipt 摘要。

## 项目、schema 与生成代码

```bash
unionid init app
unionid project check --dir app
unionid schema check --file app/schema.unid
unionid schema print --db app/data/app.redb
unionid query rust --schema app/schema.unid \
  --dir app/queries --output app/generated/queries.rs
```

`query rust` 生成共享 ADT、typed 参数、结果 row、调用函数和 query digest。schema 或 query 变化后应重新生成并重新编译客户端。

`schema rust` 可从 schema 文件或 live database 生成 serde `struct`/`enum`；`schema describe` 输出不含业务数据的 portable ADT contract。`query describe` 离线绑定单个静态 query，输出参数、结果、cardinality、canonical source 与 digest：

```bash
unionid schema describe --db app.redb --output schema.contract.json
unionid query describe --schema schema.unid \
  --file queries/find_task.unid --output generated/find_task.json
```

## 机器可读命令

`version`、`doctor`、migration、backup、restore、compact 等支持 `--format json`。自动化应根据退出码类别和结构化 error code 分支，不要匹配人类错误句子。

常见退出类：参数/用法、输入/schema、连接、存储、完整性与结果不确定。具体命令帮助始终以 `unionid <command> --help` 为准。

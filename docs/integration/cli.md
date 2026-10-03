# CLI 与 REPL

## 执行脚本

```bash
unionid run --db app.redb --file query.unid
unionid run --db app.redb -q 'from tasks | take 10'
unionid run --db app.redb --read-only --file report.unid
```

内联脚本使用 `-q`/`--query`，文件使用 `-f`/`--file`。`--read-only` 在完整 parse/bind 后、创建候选状态或持久事务前拒绝 mutation。它是执行边界，不替代文件权限。

## 查看本地 Parquet

`unionid parquet` 直接读取单个本地 Parquet 文件，显示推断出的结构类型、文件元数据和前 20 行，不需要先导入 redb：

```bash
unionid parquet events.parquet
unionid parquet events.parquet --limit 0
unionid parquet people.parquet --query 'from data | filter active | select {id, name} | sort id'
unionid parquet people.parquet --interactive
```

文件被当作只读表 `data`，可以使用 filter、select、derive、group/aggregate、sort 等现有 typed pipeline，`explain` 会显示 Parquet scan 与列投影。命令按有界 batch 扫描并下推列投影；可空列映射为 `Option<T>`，不推断命名 enum。只支持单个本地文件，不支持远程存储、多文件 glob、稳定 page cursor 或导出，也不会通过 TCP/HTTP 开放文件访问。预览最多 1,000 行。

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

`query rust` 生成共享 ADT、typed 参数、结果 row、调用函数和 query digest。schema 或 query 变化后应重新生成并重新编译客户端。生成的源码经过 canonical formatter，重复生成结果稳定。

## 格式化

```bash
unionid fmt schema.unid                       # 单个文件，输出到 stdout
unionid fmt --check schema.unid queries/*.unid
unionid fmt --write schema.unid queries/*.unid
```

`fmt` 可一次处理多个文件。`--check` 在任一文件不符合规范格式时返回非零；`--write` 先校验整批文件，全部通过后才改写，避免只格式化了一部分。不要重新格式化已经应用的 migration 文件，ledger 中的 checksum 不可变。

`schema rust` 可从 schema 文件或 live database 生成 serde `struct`/`enum`；`schema describe` 输出不含业务数据的 portable ADT contract。`query describe` 离线绑定单个静态 query，输出参数、结果、cardinality、canonical source 与 digest：

```bash
unionid schema describe --db app.redb --output schema.contract.json
unionid query describe --schema schema.unid \
  --file queries/find_task.unid --output generated/find_task.json
```

## 内置文档

安装后的二进制自带与版本匹配的用户文档，离线可用：

```bash
unionid docs
unionid docs list --category language
unionid docs show query
unionid docs show migrations --format json
```

目录按 `learn`、`language`、`application`、`lifecycle`、`integration` 和 `operations` 分类；`show` 输出带版本信息的完整 Markdown，`--format json` 输出 version 1 对象。

## Agent 能力清单

`unionid agent --format json` 输出 version 1 的机器可读清单：命令与用法、protocol/stream/storage 版本、错误契约字段（`code`/`message`/`span`/`constraint`/`hint`）、完整错误码词汇表、constraint 分类与 hint、退出码分类，以及推荐的“读 schema → 生成 → 校验 → 执行”流程。不带 `--format` 时输出 Markdown。命令只读、离线，不打开数据库，适合 AI agent、编辑器插件或 CI 在调用前发现接口。

## LLM 查询文档

`unionid docs query` 从当前二进制输出可直接加入 prompt 的查询参考和可运行示例；`--format json` 将 reference 与 examples 分开。生成真实查询时还应提供 `schema print --format json` 的 exact schema，并用 `query describe` 静态绑定。完整流程见 [LLM 查询生成](./llm)。

```bash
unionid docs query
unionid docs query --format json
```

## 机器可读命令

`version`、`doctor`、migration、backup、restore、compact 等支持 `--format json`。自动化应根据退出码类别和结构化 error code 分支，不要匹配人类错误句子。

常见退出类：参数/用法、输入/schema、连接、存储、完整性与结果不确定。具体命令帮助始终以 `unionid <command> --help` 为准。

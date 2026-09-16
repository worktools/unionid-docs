# 生产运维

上线前需要同时管理应用 schema、数据库文件、内部 storage format、备份链和服务边界。它们彼此独立，不能把“升级二进制”“应用 migration”和“恢复备份”当成同一操作。

推荐顺序：

1. [存储与故障语义](./storage)
2. [Schema migration](./migrations)
3. [备份、还原与压缩](./backup)
4. [服务与网络部署](./deployment)
5. [指标与排障](./observability)
6. [版本升级](./upgrading)

每次重大操作都应先在静止副本上演练，并验证 schema identity、ledger、typed rows、索引查询、业务读写、重开与 `check`。

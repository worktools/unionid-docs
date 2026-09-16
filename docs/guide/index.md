# 认识 unionid

unionid 是一个用 Rust 编写、直接支持代数数据类型（ADT）和 pipeline 查询的轻量数据库。它适合单机应用、嵌入式工具和需要明确数据边界的服务。

## 两个核心特点

### 数据库直接用 ADT 描述数据

积类型与和类型、option、list、tuple 和有限递归类型都属于 schema。数据库会检查 constructor、payload、默认值、主键、索引和 migration，因此非法状态更难进入存储。

### 查询语言直接理解 ADT

PRQL 风格的 pipeline 可以穷尽匹配 variant、解构嵌套字段并构造新的 typed value。读取、更新、参数绑定和 `returning` 共享相同的类型语义。

## 适用范围

当前产品面向单机、一个数据库所有者和串行写入。约 10,000 行是舒适工作集，100,000 行是已测试上限。通用扁平 join、window 与分布式执行不属于当前范围。

接下来请完成[快速开始](./getting-started)。

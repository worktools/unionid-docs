# TCP、HTTP 与流式协议

## Versioned request/response

TCP 使用一行请求、一行响应的 UTF-8 JSON Line。HTTP adapter 复用相同的 transport-neutral `Request` / `Response`：

```json
{
  "version": 2,
  "request_id": "list-1",
  "query": "from tasks | filter id == $id | take 1",
  "params": {"id": {"int": 1}}
}
```

响应包含 `ok`、message、typed columns/rows、schema revision/hash、可选 page cursor 或结构化 error。`request_id` 只关联一次尝试；exactly-once effect 使用独立 `idempotency_key`。

## 协议版本

- version 1：基础 scalar 与 ADT；
- version 2：uuid、bytes、date、timestamp、duration、decimal 的无损 wire value。

客户端应显式选择版本并在发送前预检参数边界。未知 tag、lossy JSON number 或类型不匹配会被拒绝。

## HTTP adapter

官方异步 adapter 提供 query 与 stream router，但不会自动完成身份认证、route authorization、TLS 或 rate limit。应用必须先验证 principal，再把 route 分类为 read、write 或 receipt operation。

## 有界 NDJSON stream

stream protocol version 1 使用独立 query/cancel envelope，依次产生：

```text
accepted -> schema -> row* -> complete
                         \-> error
```

operation capability 是服务生成的 128-bit bearer，不持久化。registry、frame channel、bytes、deadline 和 idle-write 都有界。进入 emitting 前释放数据库 snapshot；partial stream 不承诺断线续传，也不是 CDC。

## 稳定分页

分页 cursor 是 opaque HMAC token。客户端只能保存并原样回传，不应解析或修改。cursor 绑定数据库、schema、sequence、query digest、params 和 page size；写入或 schema 变化会返回明确过期错误。

## 网络安全

原生 server 默认应只监听 loopback。远程访问通过 mTLS gateway 或应用 HTTP gateway；raw TCP 自身没有用户、角色或逐请求 principal。

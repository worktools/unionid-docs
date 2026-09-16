# 服务与网络部署

## 单机边界

```bash
unionid server \
  --db /var/lib/unionid/app.redb \
  --addr 127.0.0.1:7878
```

推荐让 unionid 只监听 loopback，由受控 gateway 终止 TLS。数据库、backup 和 migration 文件只对专用 OS 用户开放；gateway 不应挂载 redb 文件。

## 受控网络

```text
客户端 -- mTLS --> Envoy/HTTP gateway -- loopback --> unionid -- redb
```

raw TCP 是 L4 通道：unionid 看不到 TLS principal，gateway 也不能可靠判断 payload 是读还是写。证书代表整个实例权限。需要区分读写方时，运行独立 read-only 与 writable 实例，使用不同地址、gateway 和 CA。

需要逐请求 principal 与操作授权时使用 HTTP adapter：gateway 删除外部身份 header，从已验证证书或 OIDC 写入规范身份；应用中间件在进入 unionid router 前按 read/write/receipt route 授权。

## Deadline 与资源限制

服务限制并发连接、读快照、operation registry、frame channel、响应 bytes、工作内存、deadline 与 idle write。raw TCP gateway 的超时应略大于 unionid 执行 deadline，避免先切断仍在数据库内运行的请求。

## 优雅关闭

收到 shutdown 后停止接收新请求，取消或等待有界中的 operation，串行完成 writer/maintenance 并关闭数据库。被强制终止或遇到 commit 不确定时，重启流程先执行 `check`。

## 不要这样部署

- 不要为方便把裸 server 暴露到 `0.0.0.0`；
- 不要把未验证 header 当作身份；
- 不要在日志记录 query、参数、row、idempotency key 或 cancel capability；
- 不要让两个可写进程共享同一 redb 文件。

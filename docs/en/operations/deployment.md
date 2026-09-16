# Service and network deployment

Keep the unionid server on loopback:

```bash
unionid server \
  --db /var/lib/unionid/app.redb \
  --addr 127.0.0.1:7878
```

Terminate TLS at a controlled gateway. Database, migration, and backup files belong to a dedicated OS identity; the gateway should never mount the redb path.

```text
client -- mTLS --> Envoy/HTTP gateway -- loopback --> unionid -- redb
```

Raw TCP is an L4 tunnel. unionid cannot see the TLS principal, and the gateway cannot reliably classify a JSON line as read or write. A client certificate therefore grants the whole instance's protocol authority. Separate read-only and writable instances with different addresses, gateways, and CAs when necessary.

For per-request principals, use the HTTP adapter. The gateway removes untrusted identity headers and injects a canonical identity from verified TLS or OIDC. Application middleware authorizes read, write, and receipt routes before entering unionid.

Bound connections, read snapshots, operation registry, response bytes, working memory, deadlines, and idle writes. Gateway timeouts should exceed unionid's execution deadline. Graceful shutdown stops admission, resolves bounded operations and serialized maintenance, and closes the database. Forced or uncertain termination should be followed by `check`.

Never expose a raw writable server on `0.0.0.0`, trust caller-supplied identity headers, log queries/params/rows/capabilities, or give two writers the same file.

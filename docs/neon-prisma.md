# Neon + Prisma 設定ガイド

このドキュメントは Neon（serverless Postgres）を Prisma で安全に使うための設定と運用手順をまとめます。

基本方針:

- ランタイムは pooled (pooler) 接続文字列を `DATABASE_URL` に設定する。
- マイグレーションや直接接続が必要な CLI 操作は `DIRECT_URL` を使う。
- サーバレスでは `connection_limit` を小さく設定し、`connect_timeout` を増やすことで安定化を図る。

推奨 `.env` 設定例:

```
# pooled (runtime)
DATABASE_URL="postgresql://<user>:<pw>@<project>-pooler.neon.tech/<db>?sslmode=require&channel_binding=require&connection_limit=5&connect_timeout=15&pool_timeout=20"

# direct (migrations)
DIRECT_URL="postgresql://<user>:<pw>@<project>.neon.tech/<db>?sslmode=require&channel_binding=require&connect_timeout=15"
```

`schema.prisma` の例:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // directUrl = env("DIRECT_URL") // 必要に応じて有効化
}
```

運用メモ:
- Vercel / Serverless: `connection_limit` を 1〜3 に抑えることを検討。性能は下がるが安定する。
- Prisma Client のプールサイズはサーバ上の CPU に依存するため、サーバレスでは明示的に制御すること。
- `connect_timeout` は compute cold start に合わせて 10〜20 秒に設定するのが安全。

監視:
- Neon ダッシュボードで active connections, pool usage, activation latency を監視。
- Prisma のエラー（P1001など）はログに集約し、アラート化する。

参考:
- https://neon.com/docs/guides/prisma

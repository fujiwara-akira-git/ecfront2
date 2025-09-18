# Neon Serverless Adapter PoC

目的: Neon の serverless driver と Prisma adapter を試して、サーバレス環境での安定性と低レイテンシを評価する。

手順（概略）:

依存を追加

```bash
npm install ws @prisma/adapter-neon @neondatabase/serverless --save
```

Prisma Client の設定（`schema.prisma`）

```prisma
generator client {
  provider = "prisma-client-js"
  // previewFeatures = ["driverAdapters"] // 現在の Prisma バージョンに応じて必要
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Prisma adapter の使用例（`lib/prisma.ts` の置換）

```ts
import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neonConfig } from '@neondatabase/serverless'
import ws from 'ws'

neonConfig.webSocketConstructor = ws
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL || '' })
const prisma = new PrismaClient({ adapter })
export { prisma }
```

検証項目

- 連続リクエストでの接続安定性
- cold start 後の activation latency
- 高負荷時のエラー率と再接続挙動

注意:

- adapter / serverless driver は Prisma の Preview/Adapter 機能に依存するため、Prisma バージョンと互換性を確認のこと。


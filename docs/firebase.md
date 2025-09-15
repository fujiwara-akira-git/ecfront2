# Firebase 実装ガイド（スケルトン）

このドキュメントは、Square を使った POS → Webhook 受信、および夜間バッチで EC 在庫へ反映するワークフローを Firebase 上で素早く立ち上げるためのスケルトンです。

概要
- Firestore をデータストアに使う（コレクション: orders, payments, inventory_events, inventory）
- Cloud Functions (HTTP) で Webhook を受ける
- Cloud Scheduler -> Pub/Sub -> Cloud Function で夜間バッチを実行

Firestore スキーマ（簡易）
- orders/{orderId}:
  - items: [{ sku, qty, price }]
  - total: number
  - status: 'pending' | 'paid' | 'refunded'
  - provider: 'square' | 'stripe' | ...
  - providerPaymentId: string
  - createdAt, updatedAt
- payments/{paymentId}:
  - provider, rawPayload, status, receivedAt
- inventory/{sku}:
  - qty: number

Cloud Functions
- functions/webhook: HTTP endpoint
  - 署名検証（Square の signature key を使う）
  - 受信時に payments/orders を更新、inventory_events に保存
- functions/nightlySync: Cron トリガー
  - inventory_events を集計し、inventory を減算
  - 必要であれば EC API に PATCH で反映

環境変数
- FIREBASE_PROJECT_ID, GOOGLE_APPLICATION_CREDENTIALS (サービスアカウント)
- SQUARE_WEBHOOK_SIGNATURE_KEY

検証
- ローカル開発: `firebase emulators:start` を使う。ngrok は不要だが外部 webhook のテストには ngrok を使ってもよい。

移行性
- Firestore は迅速な立ち上げに優れますが、将来的に Postgres へ移行することも可能。データアクセス層を薄く保てば移行コストが下がります。

セキュリティ
- Webhook は署名検証を必須にする。Cloud Functions は IAM / service account で保護。

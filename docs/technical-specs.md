# 技術資料

作成日: 2025-09-02

## 環境変数（.env.example を参照）
- NEXT_PUBLIC_APP_URL
- DATABASE_URL
- SQUARE_ACCESS_TOKEN
- SQUARE_LOCATION_ID
- SQUARE_WEBHOOK_SIGNATURE_KEY
- INVENTORY_SYNC_SECRET
- FREEE_COMPANY_ID
- FREEE_CLIENT_ACCESS_TOKEN
- FREEE_API_BASE
- FREEE_SALES_ACCOUNT_ID
- FREEE_TAX_ACCOUNT_ID
- FREEE_RECEIVABLE_ACCOUNT_ID

## ローカル開発手順
1. 依存をインストール
   - yarn または npm install（Next.js と TypeScript が必要）
2. TypeScript 型チェック
   - npx tsc --noEmit
3. Firebase エミュレータ
   - firebase emulators:start --only firestore,functions
4. シード投入
   - export FIRESTORE_EMULATOR_HOST=localhost:8080
   - npm run seed:emulator
5. dev サーバ開始
   - npm run dev

## テスト
- 現状: 型チェックと署名検証のローカルテストは実装済。ユニット/統合テストは未整備。

## デプロイ
- Next.js: Vercel または自社サーバ
- Firebase Functions: Firebase deploy
- 環境変数: CI/CD の secret 管理にて設定

## 監視とロギング
- webhook 処理はログを残し、エラーは再試行キューへ登録すること。

## 未解決/TODO（すぐに実施推奨）
- 在庫引当トランザクション（出荷完了時の inventory 減算を安全に実施）
- freee OAuth 実装（refresh token 管理）
- Firestore 本番ルールの整備
- 自動テスト（ユニット・E2E）と CI の導入

## 推奨アーキテクチャ改善案
1. 在庫の整合性が重要なため、Postgres 等の RDB を採用して ACID トランザクションで管理することを推奨。
2. 高負荷の webhook は Pub/Sub（或いは Cloud Tasks）を介して非同期処理し、再試行とデッドレターを実装する。

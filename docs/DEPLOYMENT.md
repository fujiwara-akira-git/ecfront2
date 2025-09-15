# 本番環境デプロイメント手順

## 1. PostgreSQL（Neon）のセットアップ

### Neonプロジェクト作成
1. [https://neon.tech](https://neon.tech) でアカウント作成
2. 新しいプロジェクト作成:
   - Project name: `eagle-palace-prod`
   - Database: `ep_production`  
   - Region: Asia Pacific (Singapore)
3. 接続文字列をコピー

### 接続文字列の形式
```
postgresql://username:password@ep-host.neon.tech/ep_production?sslmode=require
```

## 2. Vercel環境変数の設定

### 自動設定（推奨）
```bash
./setup-vercel-env.sh
```

### 手動設定
```bash
vercel env add DATABASE_URL production
vercel env add STRIPE_SECRET_KEY production  
vercel env add STRIPE_WEBHOOK_SECRET production
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production
vercel env add NEXT_PUBLIC_APP_URL production
```

## 3. データベースマイグレーション

### 本番データベースに対してマイグレーション実行
```bash
# 環境変数を設定
export DATABASE_URL="postgresql://username:password@ep-host.neon.tech/ep_production?sslmode=require"

# マイグレーション実行
./scripts/migrate-production.sh
```

## 4. デプロイメント

### ビルドとデプロイ
```bash
npm run deploy:prod
```

または個別実行:
```bash
npm run build
vercel --prod
```

## 5. Stripe Webhook エンドポイント設定

### Stripe ダッシュボードで設定
1. [https://dashboard.stripe.com](https://dashboard.stripe.com)
2. Developers → Webhooks
3. 新しいエンドポイント追加:
   - URL: `https://yourdomain.com/api/payments/webhook`
   - Events: `checkout.session.completed`
4. Webhook secretをコピーしてVercel環境変数に設定

## 6. 動作確認

### ヘルスチェック
- `https://yourdomain.com/api/health` (作成予定)
- データベース接続確認
- Stripe webhook テスト

## 7. 監視とログ

### Vercel
- デプロイメントログ
- Function logs
- エラー監視

### Neon
- データベース監視
- クエリ分析
- パフォーマンス監視

## トラブルシューティング

### データベース接続エラー
1. 接続文字列の確認
2. IP許可設定（Neonは通常不要）
3. SSL設定確認

### Stripe webhook エラー
1. エンドポイントURL確認
2. webhook secret確認
3. イベント設定確認
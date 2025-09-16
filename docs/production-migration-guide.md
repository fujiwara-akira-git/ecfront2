# 本番移行ガイド

## 配送機能の本番移行手順

### 1. 環境変数の設定

`.env.local` ファイルを編集し、以下の環境変数を本番用の値に設定してください：

```bash
# 配送API設定（本番移行時のみ設定）
YAMATO_TEST_MODE=false
JAPANPOST_TEST_MODE=false

# ヤマト運輸 本番APIキー
YAMATO_API_KEY=your_actual_yamato_api_key_here
YAMATO_WEBHOOK_SECRET=your_actual_yamato_webhook_secret_here

# 日本郵便 本番APIキー
JAPANPOST_API_KEY=your_actual_japanpost_api_key_here
JAPANPOST_CLIENT_SECRET=your_actual_japanpost_client_secret_here
```

### 2. APIキーの取得方法

#### ヤマト運輸
1. ヤマト運輸のビジネスパートナー契約を締結
2. B2クラウドAPIの利用申請
3. APIキーおよびWebhookシークレットを取得

#### 日本郵便
1. 日本郵便の法人契約を締結
2. Web APIサービスの利用申請
3. APIキーおよびクライアントシークレットを取得

### 3. Webhook設定

各配送サービスのWebhookを以下のエンドポイントに設定してください：

- **ヤマト運輸**: `https://yourdomain.com/api/delivery/webhook/yamato`
- **日本郵便**: `https://yourdomain.com/api/delivery/webhook/japanpost`

### 4. テスト手順

本番移行前に以下のテストを実施してください：

1. **テストモードでの動作確認**
   ```bash
   # テストモードで配送料計算をテスト
   curl -X POST http://localhost:3000/api/delivery/rates \
     -H "Content-Type: application/json" \
     -d '{
       "origin": "東京都中央区",
       "destination": "大阪府大阪市",
       "weightGrams": 500
     }'
   ```

2. **配送作成テスト**
   ```bash
   # テストモードで配送作成をテスト
   curl -X POST http://localhost:3000/api/delivery/create \
     -H "Content-Type: application/json" \
     -d '{
       "courierId": "yamato",
       "serviceCode": "yamato_standard",
       "origin": {"postalCode": "100-0001", "address": "東京都千代田区"},
       "destination": {"postalCode": "530-0001", "address": "大阪府大阪市"},
       "packageInfo": {"weightGrams": 500},
       "orderId": "test_order_123"
     }'
   ```

### 5. 本番移行時の注意点

- **段階的移行**: 最初は少量の注文から本番APIを使用し、問題がないことを確認
- **監視**: 本番移行後はログを定期的に確認し、エラーが発生していないかチェック
- **ロールバック**: 問題が発生した場合は `YAMATO_TEST_MODE=true` に戻してテストモードに戻す
- **バックアップ**: 本番APIキーは安全な場所にバックアップを保存

### 6. トラブルシューティング

#### 配送料計算が失敗する場合
- APIキーが正しく設定されているか確認
- ネットワーク接続を確認
- ログファイル（`tmp/stripe-webhook-logs.jsonl`）を確認

#### Webhookが届かない場合
- Webhook URLが正しく設定されているか確認
- SSL証明書が有効か確認
- ファイアウォール設定を確認

#### 配送作成が失敗する場合
- 配送サービスの契約状況を確認
- API制限に達していないか確認
- リクエストパラメータが正しいか確認

### 7. サポート

本番移行で問題が発生した場合は、以下の情報を準備してサポートにお問い合わせください：

- エラーログ
- APIレスポンス
- 環境変数設定状況
- テスト結果
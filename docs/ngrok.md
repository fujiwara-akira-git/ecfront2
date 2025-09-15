# ngrok を使った Square Webhook のローカル検証手順

1. ngrok をインストール
   - Homebrew: `brew install --cask ngrok` または公式サイトからダウンロード

2. ローカルで dev サーバを起動

```bash
npm run dev
```

3. ngrok でトンネルを作る

```bash
ngrok http 3000
```

4. Square デベロッパーダッシュボードで webhook URL を登録
   - 例: `https://<your-ngrok-id>.ngrok.io/api/payments/webhook`
   - 必要なら署名 Secret を設定（`SQUARE_WEBHOOK_SIGNATURE_KEY`）

5. テスト
   - Square の webhook テスト機能から送信
   - `firebase/functions/index.js`（ローカルの場合は Firebase emulator）や `app/api/payments/webhook/route.ts` に届くことを確認

6. 備考
   - ngrok の無料プランでは URL が毎回変わります。持続的なテストにはサブスクリプションを検討してください。

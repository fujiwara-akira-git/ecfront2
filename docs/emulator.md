# Firebase Emulator を使ったローカル E2E テスト手順

この手順で ngrok を使わずに Cloud Functions の webhook フローをローカルで検証できます。

1. 前提
   - Firebase CLI がインストールされていること（`npm install -g firebase-tools`）
   - プロジェクトのルートに `firebase/functions` が存在すること（当リポジトリに含まれています）

2. エミュレータ起動

```bash
npm run emulators:start
```

Functions は `http://localhost:5001/<project>/us-central1/<function>` でアクセスできます。Firestore は `localhost:8080`。

3. Webhook テスト
   - ローカルの functions webhook URL の例:
     `http://localhost:5001/ecfront-local/us-central1/webhook`
   - cURL で POST して署名検証をテストできます（下のサンプル参照）。

4. テスト署名の生成例（Node）

```js
const crypto = require('crypto')
const payload = JSON.stringify({ data: { object: { order: { line_items: [] } } } })
const sig = crypto.createHmac('sha256', process.env.SQUARE_WEBHOOK_SIGNATURE_KEY).update(payload).digest('base64')

// curl sample
// curl -H "Content-Type: application/json" -H "x-square-signature: <sig>" -d '<payload>' http://localhost:5001/ecfront-local/us-central1/webhook
```

備考
- エミュレータはローカル開発用です。本番デプロイ時は `firebase deploy --only functions` を使ってください。

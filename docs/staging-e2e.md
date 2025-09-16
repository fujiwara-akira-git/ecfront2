# Staging E2E: Stripe -> Delivery creation

## 目的
- ストライプの `checkout.session.completed` を受けて、`/api/delivery/create` が呼ばれ、`deliveries` ドキュメントが作成されることを検証する。

## 前提
- ステージング（またはローカル）サーバーが HTTPS で公開されているか、Stripe CLI による webhook forwarding を使用できること。
- 環境変数に本番（またはステージング）用のキーが設定されていること（`NEXTAUTH_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, 配送APIのキーなど）。

## 推奨手順（ローカルで Stripe CLI を使う）

1. サーバーをステージングモードで起動（別ターミナル）

```bash
cd /Users/akira2/projects/eagle-palace/ecfront-main2
# use .env.local or your staging env file
npm run dev
```

2. Stripe CLI を使って webhook を転送する

```bash
# 事前に stripe login が必要
# --forward-to で Next.js の API エンドポイントに転送
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

3. Checkout セッションを作成して `checkout.session.completed` を発生させる

テスト用の Checkout Session を CLI から作る（簡易例）:

```bash
stripe checkout sessions create \
  --payment_method_types card \
  --mode payment \
  --line_items '[{"price_data":{"currency":"jpy","product_data":{"name":"Test"},"unit_amount":1000},"quantity":1}]' \
  --success_url "https://example.com/success" \
  --cancel_url "https://example.com/cancel" \
  --shipping_address_collection '{"allowed_countries":["JP"]}' \
  --metadata '{"deliveryService":"japanpost","weightGrams":"500","postalCode":"150-0001"}'
```

生成された session の id を控え、CLI の `stripe trigger` を使うか、直接 `checkout.session.completed` を送信してテストできます。

4. Webhook を確認

- Stripe CLI の出力で webhook が転送されたことを確認します。
- サーバー（Next.js）のログで `checkout.session.completed` を処理し、`/api/delivery/create` への POST が行われたログを確認します。
- Firestore（または DB）の `deliveries` コレクションに該当の `deliveryId` が作成されているか確認します。

5. 失敗時の対処

- `STRIPE_WEBHOOK_SECRET` が一致しない場合、Webhook は拒否されます。Stripe CLI を使う場合は `stripe listen` が発行する signing secret を `STRIPE_WEBHOOK_SECRET` に設定してください。
- `NEXTAUTH_URL` は `http://localhost:3000` のように正しいURLを指していることを確認してください。プロキシやポート違いが原因で失敗する場合があります。

## 補足
- 本番では `stripe listen` を使わず Stripe の管理画面で webhook を登録してください。
- 配送プロバイダーが本番APIを呼ぶ場合は、事前に契約やテスト資格を取得してください。

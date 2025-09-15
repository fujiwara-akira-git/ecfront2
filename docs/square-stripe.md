# Square (POS) → EC (Stripe) 基本統合フロー

目的: 店舗の POS (Square) での売上を受け取り、夜間バッチで EC 側の在庫に反映する最小ワークフロー。

エンドポイント概要:
- `POST /api/square/webhook` — Square の Webhook を受信します。受信イベントを `.data/square-events.json` に append します。
- `POST /api/inventory/sync` — 夜間バッチで呼び出すエンドポイント。`.data/square-events.json` を読み、line_items を解析して `.data/inventory.json` を更新します。処理後、イベントファイルは空にします。

セットアップ手順（簡易）:
1. Square のデベロッパーダッシュボードで Webhook URL を設定します。例: `https://<your-host>/api/square/webhook`。
2. （任意）`SQUARE_WEBHOOK_SECRET` を環境変数に設定して署名検証を有効にします。
3. 夜間に `POST /api/inventory/sync` をトリガーする cron を用意します（Vercel の場合は Scheduled Functions、サーバーなら cron）。
4. EC 側（Stripe）で在庫を引きたい場合は、`/api/inventory/sync` の結果を使い、Stripe/Product メタデータや自社 DB を更新するスクリプトを連携してください。

注意事項:
- この実装はデモ用の最小実装です。実運用ではイベントの重複処理、部分キャンセル、返金、タイムゾーン、通貨、配送キャンセル等を考慮してください。
- Webhook の署名検証は有効化推奨です（`SQUARE_WEBHOOK_SECRET` を設定）。

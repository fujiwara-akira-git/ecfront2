# システム設計書

作成日: 2025-09-02

## 全体アーキテクチャ

- フロントエンド: Next.js (App Router), React (Server + Client Components)
- 認証: NextAuth (Credentials ベースの現行実装、拡張予定)
- データストア: Firestore（プロトタイプ）。将来的に RDB（Postgres/Supabase）を推奨
- バックグラウンド/Functions: Firebase Cloud Functions (サンプル)、夜間同期バッチ
- 決済/POS: Square (POS)、Stripe (EC) を想定。プロバイダ抽象で切替可能
- 会計連携: freee API

## コンポーネント設計

- lib/providers: 決済プロバイダ抽象（createCheckoutSession, verifyWebhook, handleWebhookEvent）
- lib/integrations/freee.ts: voucher 作成ヘルパ
- api routes: payments, freee, shipments, inventory sync
- UI: layout, shop pages, cart client components, CartBadge, SearchBar

## データモデル（Firestore）
- products, inventory, customers, purchases, transactions, adminUsers, partners, stockEntries, shipments
- 各コレクションの主要フィールドについては `docs/requirements.md` を参照

## API 契約（主要）
- POST /api/shipments/register
  - req: { productId, producerId, quantity, scheduledAt }
  - res: { ok: true, id }
- POST /api/shipments/complete
  - req: { shipmentId, completedAt? }
  - res: { ok: true }
- POST /api/freee/voucher
  - req: OrderPayload
  - res: freee API のレスポンス or エラー

## シーケンス（出荷完了→在庫引落 の想定フロー）
1. 生産者が iOS で出荷完了ボタンを押す → /api/shipments/complete を呼ぶ
2. サーバが該当 shipment の status を completed に更新
3. バックエンドで在庫トランザクションを実行して inventory.quantity を減算（未実装）
4. 在庫差異は transactions / stockEntries に記録

## セキュリティ設計
- Webhook: 署名検証（HMAC-SHA256 等）を行う
- freee: アクセストークンは環境変数、refresh token 処理は別途実装
- Firestore: 本番ルールは厳格化（role ベースの制御）

## 非機能観点
- スケーラビリティ: webhook の高頻度受信は Cloud Functions で水平スケール可能
- 耐障害性: イベントは永続化（DB）して再処理可能にすること

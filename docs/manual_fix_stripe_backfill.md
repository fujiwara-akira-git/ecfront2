# Manual Fix: Backfill `Payment.stripeId`

このドキュメントは、Stripe の決済 ID (`pi_...` / `ch_...`) を既存の `Payment` レコードの `stripeId` に手動で反映する安全手順をまとめたものです。自動スクリプトが解決できないケース（Checkout Session が expired / unpaid、または StripeEvent が簡易保存されている場合）向けの手順です。

**前提**
- あなたはデータベース（Neon/Postgres）に接続できること。
- `psql` または Prisma を使って SQL を実行できること。
- 管理者が Stripe ダッシュボードにアクセスでき、該当の Checkout Session / PaymentIntent / Charge を確認できること。

---

## 1) 調査: Stripe 上で session を確認する

- Stripe ダッシュボードにログインして `Checkout Sessions` を検索または `Search` で `cs_` や `sess_`、関連する `orderId` を入力してイベントを探します。
- 該当セッションが見つかったら、Session の詳細で `Payment Intent`（`pi_...`）や `Latest charge`（`ch_...`）が記録されているか確認してください。
- 見つかった `pi_` / `ch_` のうち、最も確実な ID をメモします（通常 `pi_` を優先して使用します）。

---

## 2) 安全な更新の方針

- 少数件を手動で更新する場合、トランザクションを使って `SELECT ... FOR UPDATE` → `UPDATE` → `COMMIT` の手順で実行してください。
- まずは `BEGIN;` と `ROLLBACK;` を使ったドライランで変更を検証します。
- 重要なカラム: `Payment.id`, `Payment.stripeId`, `Payment.orderId`, 変更前後の確認のため `createdAt` を参照します。

---

## 3) SQL: 検証クエリ（変更前）

- 候補の `Payment` を確認:

```
psql "$DATABASE_URL" -c "SELECT id, \"stripeId\", status, amount, \"orderId\", \"createdAt\" FROM \"Payment\" WHERE id = 'PUT_PAYMENT_ID_HERE';"
```

- `StripeEvent` の payload を確認（関連する sessionId があるか）:

```
psql "$DATABASE_URL" -c "SELECT id, type, processed, \"createdAt\", payload::text FROM \"StripeEvent\" WHERE payload::text LIKE '%PUT_ORDER_ID_HERE%';"
```

---

## 4) SQL: 安全な手動更新（トランザクション）

- ドライラン（変更しない）:

```
psql "$DATABASE_URL" <<SQL
BEGIN;
-- 選択した payment をロックして中身を確認
SELECT id, \"stripeId\", status, amount, \"orderId\", \"createdAt\" FROM \"Payment\" WHERE id = 'PUT_PAYMENT_ID_HERE' FOR UPDATE;
-- ここで内容を確認し、問題なければ UPDATE を実行する（この例は実際にはコメントアウト）
-- UPDATE "Payment" SET "stripeId" = 'pi_XXXXXXXXXXXXXXXX' WHERE id = 'PUT_PAYMENT_ID_HERE';
ROLLBACK;
SQL
```

- 反映（実行）:

```
psql "$DATABASE_URL" <<SQL
BEGIN;
SELECT id, \"stripeId\", status, amount, \"orderId\", \"createdAt\" FROM \"Payment\" WHERE id = 'PUT_PAYMENT_ID_HERE' FOR UPDATE;
UPDATE "Payment" SET "stripeId" = 'pi_XXXXXXXXXXXXXXXX' WHERE id = 'PUT_PAYMENT_ID_HERE';
-- 確認
SELECT id, \"stripeId\", status, amount, \"orderId\", \"createdAt\" FROM \"Payment\" WHERE id = 'PUT_PAYMENT_ID_HERE';
COMMIT;
SQL
```

---

## 5) 検証（更新後）

- 更新が反映されたことを確認:

```
psql "$DATABASE_URL" -c "SELECT id, \"stripeId\", status, amount, \"orderId\", \"createdAt\" FROM \"Payment\" WHERE id = 'PUT_PAYMENT_ID_HERE';"
```

- `Payment.stripeId` の値が Stripe ダッシュボードで一致することを確認してください。

---

## 6) ロールバック

- トランザクション方式で更新した場合は `ROLLBACK;` で無効化できます。もし `COMMIT;` 後に戻す必要がある場合は、バックアップから復旧するか、前の値を別途記録しておき `UPDATE` で戻してください。

---

## 7) 追加のヒント

- 複数件を一括で更新する場合、必ず小さなバッチ（例: 10 件ずつ）で実行し、各バッチ後に検証を入れてください。
- 自動スクリプトで処理する場合は、`StripeEvent` の payload に `payment_intent` を含むか、または Stripe API で session を確認できることが必要です。

---

必要であれば、私の方で特定 `Payment.id` を指定してロックして更新する操作も代行できます。更新する `pi_...` または `ch_...` を教えてください。

# Firestore ドキュメント設計

作成日: 2025-09-02

このドキュメントは ER 図を元に、Firestore（ドキュメント指向）での具体的なドキュメント例、インデックス、トランザクション方針を示します。

目次
- コレクション一覧
- ドキュメント例（JSON）
- インデックス設計
- トランザクションと一貫性戦略
- 実装の注意点

## コレクション一覧（トップレベル）
- products
- inventory        // 在庫：productId + locationId ごとの在庫数
- customers
- purchases        // 注文（ヘッダ）
- purchaseItems    // （任意）注文明細（purchases のサブコレクションでも可）
- transactions     // 会計イベント（仕訳や入出金）
- adminUsers
- partners
- stockEntries     // 入出庫記録（履歴）
- shipments        // 生産者の出荷予約・完了
- webhookEvents    // 受信した外部イベント（再処理用）

※ Firestore はスキーマレスですが、設計ガイドに従って運用すると保守性が上がります。

## ドキュメント例

products/{id}
```json
{
  "id": "p1",
  "name": "りんご",
  "price": 200,
  "producerName": "山田農園",
  "category": "果物",
  "description": "シャキッとしたりんご"
}
```

inventory/{id}
```json
{
  "id": "inv1",
  "productId": "p1",
  "locationId": "shop1",
  "quantity": 120,
  "updatedAt": "2025-09-02T10:00:00Z"
}
```

customers/{id}
```json
{
  "id": "c1",
  "name": "田中太郎",
  "email": "taro@example.com",
  "phone": "090-0000-0000",
  "freee_partner_id": null
}
```

purchases/{id}
```json
{
  "id": "o1",
  "customerId": "c1",
  "subtotal": 1000,
  "taxAmount": 100,
  "total": 1100,
  "currency": "JPY",
  "status": "paid",
  "createdAt": "2025-09-02T11:00:00Z"
}
```

purchaseItems/{id} (もしくは purchases/{id}/items/*)
```json
{
  "id": "pi1",
  "purchaseId": "o1",
  "productId": "p1",
  "qty": 2,
  "unitPrice": 500
}
```

transactions/{id}
```json
{
  "id": "t1",
  "purchaseId": "o1",
  "type": "sale",
  "amount": 1100,
  "createdAt": "2025-09-02T11:01:00Z"
}
```

stockEntries/{id}
```json
{
  "id": "se1",
  "productId": "p1",
  "locationId": "shop1",
  "qty": 100,
  "type": "inbound",
  "createdAt": "2025-09-01T08:00:00Z"
}
```

shipments/{id}
```json
{
  "id": "ship_abc",
  "productId": "p1",
  "producerId": "producer_1",
  "quantity": 50,
  "scheduledAt": "2025-09-10T09:00:00Z",
  "status": "scheduled",
  "createdAt": "2025-09-02T09:00:00Z"
}
```

webhookEvents/{id}
```json
{
  "id": "evt_1",
  "provider": "square",
  "raw": { /* raw payload */ },
  "processed": false,
  "receivedAt": "2025-09-02T12:00:00Z"
}
```

## インデックス設計
- inventory: composite index (productId, locationId) を作成することで location ごとの在庫検索を高速化
- purchases: index on customerId, createdAt
- webhookEvents: index on processed, receivedAt

Firestore コンソールで必要な複合インデックスを追加してください。必要に応じて `firestore.indexes.json` を作成して `firebase deploy --only firestore:indexes` を利用します。

## トランザクションと一貫性戦略

1. 在庫引当（出荷完了・購入確定）
   - 在庫は強い一貫性が必要。Firestore のトランザクションを用いて、inventory ドキュメントを読み取り、数量チェック→更新を行う。
   - 例: transaction.get(inventoryDoc) -> if qty >= needed then transaction.update(inventoryDoc, { quantity: qty - needed }) -> transaction.commit()

2. イベント永続化と夜間バッチ
   - Webhook はまず `webhookEvents` に保存（raw）。夜間バッチが未処理イベントを集約して inventory を更新。
   - バッチは idempotent に実装。イベントを処理したら `processed=true` と `processedAt` を設定する。

3. 複数拠点・複数プロセス対策
   - 同一 inventory ドキュメントに対する並列更新はトランザクションで防ぐ。高スループットが必要なら在庫ごとにシャーディング（複数キーに分割）を検討。

## セキュリティルール（概要）
- 本番では次の方針を適用
  - 管理系（adminUsers, transactions 等）は認証かつ admin claim を持つユーザーのみ書き込み可
  - purchases は注文作成を認証済みユーザーに許可。購入の閲覧は注文者または管理者に限定
  - webhookEvents の書き込みは server-side（認証済 function）からのみ許可

例: 簡易ルール（エミュレータ用は `firebase/firestore.rules` を参照）

```js
// pseudocode
match /inventory/{id} {
  allow read: if true;
  allow write: if request.auth.token.admin == true || request.auth.uid == 'server';
}
```

## 実装の注意点
- Firestore はドキュメントサイズ制限がある（1MB）。大きな raw payload は Cloud Storage に保存し参照する。
- purchaseItems を purchases サブコレクションに入れると一括取得がしやすいが、クエリ性と書き込みの分散化を考慮する。
- 在庫は頻繁に更新されるため、過度なホットスポット（単一ドキュメントへの集中更新）を避ける。

## 運用例: 出荷完了時の在庫更新（擬似コード）

```
// server-side (firebase-admin)
await db.runTransaction(async (tx) => {
  const invRef = db.collection('inventory').doc(invId)
  const inv = await tx.get(invRef)
  if (!inv.exists) throw new Error('inventory not found')
  const qty = inv.data().quantity
  if (qty < deduct) throw new Error('insufficient stock')
  tx.update(invRef, { quantity: qty - deduct, updatedAt: new Date().toISOString() })
  tx.set(db.collection('stockEntries').doc(), { productId, locationId, qty: -deduct, type: 'outbound', createdAt: new Date().toISOString() })
})
```

これにより出荷完了による在庫差し引きは原子的に行えます。

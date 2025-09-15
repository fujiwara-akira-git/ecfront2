# データベース移行ガイド

Eagle Palace ECプロジェクトにおけるデータベース移行の詳細ガイドです。

## 📋 概要

このプロジェクトでは、従来の静的データからPostgreSQLデータベースへの完全移行を実装しています。

## 🗄️ データベーススキーマ

### 主要テーブル構造

#### Users（ユーザー）
```sql
TABLE users {
  id: String (Primary Key, UUID)
  email: String (Unique)
  password: String (Hashed)
  name: String?
  role: UserRole (CUSTOMER | ADMIN)
  created_at: DateTime
  updated_at: DateTime
}
```

#### Categories（カテゴリ）
```sql
TABLE categories {
  id: String (Primary Key, UUID)
  name: String (Unique)
  description: String?
  created_at: DateTime
  updated_at: DateTime
}
```

#### Producers（生産者）
```sql
TABLE producers {
  id: String (Primary Key, UUID)
  name: String (Unique)
  location: String?
  description: String?
  created_at: DateTime
  updated_at: DateTime
}
```

#### Products（商品）
```sql
TABLE products {
  id: String (Primary Key, UUID)
  name: String
  description: String?
  price: Int (円単位)
  category_id: String (Foreign Key → categories)
  producer_id: String (Foreign Key → producers)
  image_url: String?
  created_at: DateTime
  updated_at: DateTime
}
```

#### Inventories（在庫）
```sql
TABLE inventories {
  id: String (Primary Key, UUID)
  product_id: String (Foreign Key → products, Unique)
  quantity: Int
  reserved: Int (予約済み数量)
  updated_at: DateTime
}
```

#### CartItems（カート商品）
```sql
TABLE cart_items {
  id: String (Primary Key, UUID)
  user_id: String (Foreign Key → users)
  product_id: String (Foreign Key → products)
  quantity: Int
  created_at: DateTime
  updated_at: DateTime
  
  // 複合ユニークキー: 1人のユーザーが同じ商品を重複してカートに追加できない
  @@unique([user_id, product_id])
}
```

#### Orders（注文）
```sql
TABLE orders {
  id: String (Primary Key, UUID)
  user_id: String (Foreign Key → users)
  total_amount: Int
  status: OrderStatus (PENDING | CONFIRMED | SHIPPED | DELIVERED | CANCELLED)
  shipping_address: String
  created_at: DateTime
  updated_at: DateTime
}
```

#### OrderItems（注文商品）
```sql
TABLE order_items {
  id: String (Primary Key, UUID)
  order_id: String (Foreign Key → orders)
  product_id: String (Foreign Key → products)
  quantity: Int
  price_at_time: Int (注文時の商品価格)
  created_at: DateTime
}
```

#### Payments（決済）
```sql
TABLE payments {
  id: String (Primary Key, UUID)
  order_id: String (Foreign Key → orders, Unique)
  amount: Int
  payment_method: String
  payment_status: PaymentStatus (PENDING | COMPLETED | FAILED | REFUNDED)
  transaction_id: String? (外部決済システムのID)
  created_at: DateTime
  updated_at: DateTime
}
```

## 🔄 移行プロセス

### 1. 旧システムからの移行データ

#### 移行前の静的データ
```typescript
// 旧: app/shop/products/_data.ts
export const categories = [
  { id: '1', name: '葉物野菜' },
  { id: '2', name: '根菜類' },
  { id: '3', name: 'セット商品' }
];

export const producers = [
  { id: '1', name: '田中農園', location: '埼玉県桶川市' },
  // ...
];

export const products = [
  {
    id: '1',
    name: '朝どり新鮮レタス',
    price: 280,
    category: '葉物野菜',
    producer: '田中農園'
  },
  // ...
];
```

#### 移行後のデータベースデータ
```typescript
// 新: prisma/seed.ts で管理
const categories = await prisma.category.createMany({
  data: [
    { id: uuidv4(), name: '葉物野菜', description: '新鮮な葉物野菜各種' },
    { id: uuidv4(), name: '根菜類', description: '土の香りが豊かな根菜' },
    { id: uuidv4(), name: 'セット商品', description: 'お得な野菜セット' }
  ]
});
```

### 2. 移行手順

#### Step 1: スキーマ適用
```bash
# Prismaスキーマをデータベースに適用
npx prisma db push
```

#### Step 2: 初期データ投入
```bash
# シードスクリプト実行
npm run seed
```

#### Step 3: データ確認
```bash
# Prisma Studio でデータ確認
npx prisma studio
```

### 3. ハイブリッドカートシステムの実装

#### カートデータの保存方式

**未ログインユーザー**: 
- localStorage に保存
- ブラウザを閉じても一時的に保持

**ログイン済みユーザー**:
- データベースに保存
- デバイス間で共有可能
- 永続的な保存

#### カート移行ロジック

```typescript
// app/contexts/CartContext.tsx
const migratLocalCartToDatabase = async () => {
  const localCart = JSON.parse(localStorage.getItem('cart') || '[]');
  
  if (localCart.length > 0) {
    try {
      // ローカルカートをデータベースに移行
      const response = await fetch('/api/cart/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: localCart })
      });
      
      if (response.ok) {
        // 移行成功後、ローカルストレージをクリア
        localStorage.removeItem('cart');
        // データベースからカートを再読み込み
        await fetchCart();
      }
    } catch (error) {
      console.error('Cart migration failed:', error);
    }
  }
};
```

## 🔍 移行前後の比較

### API エンドポイント

#### 旧システム（静的データ）
```typescript
// データは直接インポート
import { products } from '@/app/shop/products/_data';

// 商品一覧取得
const getProducts = () => products;

// 商品詳細取得
const getProduct = (id: string) => products.find(p => p.id === id);
```

#### 新システム（データベース）
```typescript
// API経由でデータベースから取得
// GET /api/products - 商品一覧
// GET /api/products/[id] - 商品詳細
// GET /api/cart - カート取得
// POST /api/cart - カート追加
// PUT /api/cart/[id] - カート更新
// DELETE /api/cart/[id] - カート削除
```

### 在庫管理

#### 旧システム
- 在庫概念なし
- 無限に購入可能

#### 新システム
- リアルタイム在庫管理
- 在庫数チェック機能
- 予約済み在庫の管理

### ユーザー体験

#### カート機能の改善
- **永続化**: ログインユーザーのカートはデバイス間で共有
- **リアルタイム**: 在庫状況の即座反映
- **整合性**: 重複商品の自動マージ

## 🚨 移行時の注意事項

### 1. データ型の変換
- 価格: `number` → `Int` (円単位)
- ID: `string` → `UUID`
- 日付: 手動管理 → `DateTime` (自動)

### 2. 外部キー制約
- 商品削除時は関連するカート・注文データの確認が必要
- ユーザー削除時は関連データの整合性保持が必要

### 3. インデックス最適化
```prisma
model Product {
  // 検索最適化のためのインデックス
  @@index([category_id])
  @@index([producer_id])
  @@index([created_at])
}

model CartItem {
  // ユーザーカート取得の最適化
  @@index([user_id])
  @@unique([user_id, product_id])
}
```

### 4. セキュリティ考慮事項
- パスワードのハッシュ化（bcryptjs使用）
- セッション管理（NextAuth使用）
- API エンドポイントの認証チェック

## 🛠️ 移行後のメンテナンス

### データベースバックアップ
```bash
# データベースダンプ作成
pg_dump ep_dev > backup_$(date +%Y%m%d).sql

# バックアップからの復元
psql ep_dev < backup_20241206.sql
```

### マイグレーション管理
```bash
# 新しいマイグレーション作成
npx prisma migrate dev --name "add_new_feature"

# 本番環境へのマイグレーション適用
npx prisma migrate deploy
```

### パフォーマンス監視
- Prisma Studio での接続監視
- クエリパフォーマンスの定期チェック
- インデックス使用状況の確認

## 📊 移行成果

### 改善点
1. **データの永続化**: ブラウザクリア後もデータ保持
2. **整合性**: 外部キー制約によるデータ整合性
3. **スケーラビリティ**: 大量データへの対応可能
4. **リアルタイム性**: 在庫状況の即座反映
5. **セキュリティ**: データベースレベルでの制約

### パフォーマンス
- 商品一覧: 静的データ → データベースクエリ
- カート操作: localStorage → データベースAPI
- 認証: セッション管理の向上

---

この移行により、Eagle Palace ECはスケーラブルで信頼性の高いECプラットフォームとなりました。
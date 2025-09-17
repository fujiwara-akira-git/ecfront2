# 開発・運用注意事項

Eagle Palace ECプロジェクトの開発・運用における重要な注意事項とベストプラクティスをまとめています。

## ⚠️ セキュリティ関連注意事項

### 1. 環境変数の管理

**重要**: `.env.local` ファイルは絶対にGitにコミットしないでください。

```bash
# .gitignoreに含まれているか確認
cat .gitignore | grep -E "\.env"

# 出力例:
# .env*.local
# .env.local
# .env.development.local
# .env.test.local
# .env.production.local
```

**本番環境での必須変更項目**:

```env
# 本番環境用 .env.local
NEXTAUTH_URL="https://yourdomain.com"  # 実際のドメインに変更
NEXTAUTH_SECRET="SUPER_STRONG_SECRET_32_CHARS_OR_MORE"  # 強力なシークレット
DATABASE_URL="postgresql://user:password@host:5432/production_db"  # 本番DB
```

### 2. データベースセキュリティ

**テストユーザーの本番削除**:
```sql
-- 本番環境では必ずテストユーザーを削除
DELETE FROM users WHERE email IN ('admin@test.com', 'customer@test.com');
```

**データベース接続の制限**:
- 本番環境では特定のIPアドレスからのみアクセス許可
- データベースユーザーに最小限の権限のみ付与
- 定期的なパスワード変更

### 3. 認証セキュリティ

**推奨セキュリティ設定**:
```typescript
// 本番環境での認証設定強化
session: {
  strategy: "jwt",
  maxAge: 7 * 24 * 60 * 60, // 7日（30日から短縮）
  updateAge: 1 * 60 * 60,    // 1時間ごとに更新（24時間から短縮）
},
pages: {
  signIn: '/shop/auth/signin',
  error: '/shop/auth/error',
},
callbacks: {
  jwt: async ({ token, user }) => {
    // IP アドレスの記録・検証
    // 異常なアクセスパターンの検出
  }
}
```

## 🗄️ データベース管理注意事項

### 1. マイグレーション管理

**開発環境**:
```bash
# スキーマの変更をプッシュ（開発用）
npx prisma db push
```

**本番環境**:
```bash
# 必ずマイグレーションファイルを作成
npx prisma migrate dev --name "describe_your_changes"

# 本番環境にマイグレーション適用
npx prisma migrate deploy
```

### 2. データバックアップ

**定期バックアップの設定**:
```bash
#!/bin/bash
# backup.sh - 毎日実行するバックアップスクリプト

DATE=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL > "backups/backup_${DATE}.sql"

# 7日以上古いバックアップを削除
find backups/ -name "backup_*.sql" -mtime +7 -delete
```

**バックアップからの復元**:
```bash
# データベースリセット（注意：全データ削除）
dropdb ep_production
createdb ep_production

# バックアップから復元
psql ep_production < backups/backup_20241206_120000.sql
```

### 3. パフォーマンス監視

**スロークエリの監視**:
```sql
-- PostgreSQL でスロークエリを確認
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;
```

## 🚀 デプロイメント注意事項

### 1. ビルド前チェックリスト

```bash
# TypeScript エラーチェック
npm run build

# Linting チェック
npm run lint

# テスト実行
npm run test
```

### 2. 本番環境変数

**Vercel デプロイ時の環境変数設定**:
```bash
# Vercel CLI での環境変数設定
vercel env add DATABASE_URL production
vercel env add NEXTAUTH_URL production  
vercel env add NEXTAUTH_SECRET production
```

**Railway デプロイ時**:
```bash
# Railway CLI での環境変数設定
railway variables set DATABASE_URL="postgresql://..."
railway variables set NEXTAUTH_URL="https://yourdomain.railway.app"
railway variables set NEXTAUTH_SECRET="your-secret"
```

### 3. ドメイン設定

**NEXTAUTH_URL の正確な設定**:
```env
# 間違い例
NEXTAUTH_URL=localhost:3000
NEXTAUTH_URL=http://yourdomain.com/  # 末尾スラッシュは不要

# 正解例
NEXTAUTH_URL=config.getBaseUrl()   # 開発環境
NEXTAUTH_URL=https://yourdomain.com  # 本番環境（HTTPS必須）
```

## 📊 パフォーマンス最適化

### 1. データベースクエリ最適化

**N+1問題の回避**:
```typescript
// ❌ N+1問題のあるクエリ
const products = await prisma.product.findMany();
for (const product of products) {
  const category = await prisma.category.findUnique({
    where: { id: product.categoryId }
  });
}

// ✅ 最適化されたクエリ
const products = await prisma.product.findMany({
  include: {
    category: true,
    producer: true,
    inventory: true
  }
});
```

**インデックスの活用**:
```prisma
// よく検索される条件にインデックスを追加
model Product {
  // 価格帯での検索が多い場合
  @@index([price])
  
  // カテゴリ別検索が多い場合  
  @@index([categoryId])
  
  // 作成日順ソートが多い場合
  @@index([createdAt])
}
```

### 2. フロントエンド最適化

**画像最適化**:
```typescript
// Next.js Image コンポーネントの使用
import Image from 'next/image';

<Image
  src={product.imageUrl}
  alt={product.name}
  width={300}
  height={200}
  priority={false} // Above-the-fold画像のみtrue
  placeholder="blur" // ブラー効果
/>
```

**キャッシング戦略**:
```typescript
// API ルートでのキャッシング
export async function GET() {
  const products = await prisma.product.findMany();
  
  return NextResponse.json(products, {
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=600'
    }
  });
}
```

## 🛠️ 開発ワークフロー

### 1. Git ワークフロー

**ブランチ戦略**:
```bash
# 機能開発
git checkout -b feature/new-payment-system
git add .
git commit -m "feat: add stripe payment integration"
git push origin feature/new-payment-system

# プルリクエスト作成後、マージ
```

**コミットメッセージ規約**:
```bash
feat: 新機能の追加
fix: バグ修正  
docs: ドキュメントの変更
style: コードフォーマットの変更
refactor: リファクタリング
test: テストの追加・修正
chore: その他の変更
```

### 2. 環境の分離

```bash
# 開発環境
npm run dev              # localhost:3000

# テスト環境  
npm run build && npm start  # localhost:3000 (プロダクションビルド)

# 本番環境
# Vercel/Railway等のプラットフォームにデプロイ
```

## 📱 モバイル対応注意事項

### 1. レスポンシブデザイン

**Tailwind CSS でのモバイルファースト**:
```tsx
// モバイルファーストのレスポンシブ設計
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* モバイル: 1列、タブレット: 2列、デスクトップ: 3列 */}
</div>
```

### 2. タッチUI最適化

```css
/* タッチターゲットサイズ */
.touch-target {
  min-height: 44px;  /* iOSガイドライン */
  min-width: 44px;
}

/* スクロール最適化 */
.scroll-container {
  -webkit-overflow-scrolling: touch;
  overflow-scrolling: touch;
}
```

## 🔍 監視・ログ管理

### 1. エラー監視

**エラーハンドリングの実装**:
```typescript
// API エンドポイントでのエラーハンドリング
export async function POST(request: Request) {
  try {
    // メイン処理
    return NextResponse.json({ success: true });
  } catch (error) {
    // エラーログ出力
    console.error('API Error:', error);
    
    // Sentryなどの監視サービスに送信
    // Sentry.captureException(error);
    
    return NextResponse.json(
      { error: '内部サーバーエラー' },
      { status: 500 }
    );
  }
}
```

### 2. アクセスログ

**Next.js でのアクセスログ**:
```typescript
// middleware.ts でのアクセスログ
export function middleware(request: NextRequest) {
  console.log({
    method: request.method,
    url: request.url,
    userAgent: request.headers.get('user-agent'),
    timestamp: new Date().toISOString()
  });
  
  return NextResponse.next();
}
```

## 💾 データの整合性

### 1. トランザクション管理

```typescript
// 複数テーブル更新時のトランザクション
await prisma.$transaction(async (tx) => {
  // 在庫を減らす
  await tx.inventory.update({
    where: { productId },
    data: { quantity: { decrement: orderQuantity } }
  });
  
  // 注文を作成
  await tx.order.create({
    data: orderData
  });
  
  // カートをクリア
  await tx.cartItem.deleteMany({
    where: { userId }
  });
});
```

### 2. データバリデーション

```typescript
// Prisma でのバリデーション
model Product {
  price     Int     @db.Integer @default(0)
  // 価格は負の値を許可しない制約をアプリケーションレベルで実装
}

// API でのバリデーション
if (price < 0) {
  return NextResponse.json(
    { error: '価格は0以上である必要があります' },
    { status: 400 }
  );
}
```

## 🚨 緊急対応手順

### 1. サイトダウン時の対応

```bash
# 1. サーバーログの確認
kubectl logs -f deployment/eagle-palace-ec

# 2. データベース接続確認
psql $DATABASE_URL -c "SELECT 1;"

# 3. 前回の正常稼働バージョンへロールバック
vercel rollback
# または
railway rollback
```

### 2. データベース障害時の対応

```bash
# 1. 最新バックアップの確認
ls -la backups/ | tail -5

# 2. 読み取り専用モードの有効化
# アプリケーションレベルでの実装が必要

# 3. バックアップからの復元
psql $DATABASE_URL < backups/latest_backup.sql
```

## 📚 継続的な学習・改善

### 1. 技術スタックの更新

```bash
# 定期的な依存関係の更新
npm audit
npm update

# セキュリティ脆弱性の確認
npm audit --audit-level high
```

### 2. パフォーマンス監視

**Core Web Vitals の監視**:
- Largest Contentful Paint (LCP): 2.5秒以下
- First Input Delay (FID): 100ms以下  
- Cumulative Layout Shift (CLS): 0.1以下

**監視ツール**:
- Lighthouse
- WebPageTest
- Google PageSpeed Insights

---

この注意事項を遵守することで、Eagle Palace ECプロジェクトの安全で効率的な開発・運用を実現できます。定期的にこのドキュメントを見直し、最新のベストプラクティスに更新してください。
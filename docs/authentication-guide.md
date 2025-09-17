# ユーザー認証ガイド

Eagle Palace ECプロジェクトでのユーザー認証システムの詳細ガイドです。

## 👥 テストユーザーアカウント

プロジェクトセットアップ後、以下のテストアカウントが利用可能です：

### 🔑 管理者アカウント

**基本情報**:
- **メールアドレス**: `admin@test.com`
- **パスワード**: `admin123`
- **ロール**: `ADMIN`
- **作成日**: システムセットアップ時に自動作成

**アクセス権限**:
- ✅ 管理画面へのフルアクセス (`/admin`)
- ✅ 商品管理（追加・編集・削除）
- ✅ 在庫管理
- ✅ 注文管理・発送管理
- ✅ ユーザー管理
- ✅ 売上データ分析
- ✅ POS機能
- ✅ 一般ユーザー機能（商品購入等）

**アクセス可能ページ**:
```
/admin                    # 管理画面ダッシュボード
/admin/inventory         # 在庫管理
/admin/sales            # 売上管理
/admin/contact          # お問い合わせ管理
/admin/pos              # POS システム
/shop                   # 一般ショップ機能
/shop/products          # 商品一覧（管理者ビュー）
/shop/cart              # カート機能
```

### 👤 一般顧客アカウント

**基本情報**:
- **メールアドレス**: `customer@test.com`
- **パスワード**: `customer123`
- **ロール**: `CUSTOMER`
- **作成日**: システムセットアップ時に自動作成

**アクセス権限**:
- ✅ 商品閲覧・購入
- ✅ カート機能（データベース連携）
- ✅ 注文履歴確認
- ✅ プロフィール管理
- ❌ 管理画面アクセス不可

**アクセス可能ページ**:
```
/shop                   # ショップトップ
/shop/products          # 商品一覧
/shop/products/[id]     # 商品詳細
/shop/cart              # ショッピングカート
/shop/auth/signin       # ログイン
/shop/auth/signup       # 新規登録
```

## 🔐 認証システム仕様

### 認証技術スタック

- **認証ライブラリ**: NextAuth.js v4
- **セッション管理**: JWT + データベースセッション
- **パスワードハッシュ**: bcryptjs
- **認証プロバイダー**: Credentials Provider

### 認証フロー

#### ログインプロセス

1. **ユーザー情報入力**
   ```typescript
   // ログインフォーム送信
   const result = await signIn('credentials', {
     email: 'user@example.com',
     password: 'password',
     redirect: false
   });
   ```

2. **認証チェック**
   ```typescript
   // app/api/auth/options.ts
   const user = await prisma.user.findUnique({
     where: { email: credentials.email }
   });
   
   const isValid = await bcrypt.compare(
     credentials.password,
     user.password
   );
   ```

3. **セッション作成**
   ```typescript
   // JWTコールバック
   jwt: async ({ token, user }) => {
     if (user) {
       token.role = user.role;
       token.id = user.id;
     }
     return token;
   }
   ```

4. **セッション情報返却**
   ```typescript
   // セッションコールバック
   session: async ({ session, token }) => {
     session.user.role = token.role;
     session.user.id = token.id;
     return session;
   }
   ```

### 認証ミドルウェア

```typescript
// middleware.ts
import { withAuth } from "next-auth/middleware"

export default withAuth(
  function middleware(req) {
    // 管理者ページは ADMIN ロールのみアクセス可能
    if (req.nextUrl.pathname.startsWith("/admin")) {
      if (req.nextauth.token?.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/", req.url))
      }
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token
    },
  }
)

export const config = {
  matcher: ["/admin/:path*", "/shop/cart", "/api/cart/:path*"]
}
```

## 🛡️ セキュリティ仕様

### パスワード要件

**開発環境（テスト用）**:
- 最小文字数: 6文字
- 文字種別: 制限なし
- 例: `admin123`, `customer123`

**本番環境推奨**:
- 最小文字数: 8文字以上
- 英大文字・小文字・数字・記号を含む
- 辞書攻撃に対する耐性

### セッション管理

```typescript
// セッション設定
session: {
  strategy: "jwt",
  maxAge: 30 * 24 * 60 * 60, // 30日
  updateAge: 24 * 60 * 60,    // 24時間ごとに更新
}
```

### CSRF対策

- NextAuth.jsの内蔵CSRF保護
- APIエンドポイントでの自動トークン検証

## 🔄 新規ユーザー登録

### 登録プロセス

1. **新規登録フォーム**
   - `/shop/auth/signup` でアクセス
   - メールアドレス・パスワード・名前を入力

2. **バリデーション**
   ```typescript
   // 重複チェック
   const existingUser = await prisma.user.findUnique({
     where: { email }
   });
   
   if (existingUser) {
     throw new Error('このメールアドレスは既に使用されています');
   }
   ```

3. **パスワードハッシュ化**
   ```typescript
   const hashedPassword = await bcrypt.hash(password, 12);
   ```

4. **ユーザー作成**
   ```typescript
   const user = await prisma.user.create({
     data: {
       email,
       password: hashedPassword,
       name,
       role: 'CUSTOMER' // デフォルトは顧客
     }
   });
   ```

## 🎭 ロールベース認証

### ロール定義

```prisma
enum UserRole {
  CUSTOMER  // 一般顧客
  ADMIN     // 管理者
}
```

### 権限マトリックス

| 機能 | CUSTOMER | ADMIN |
|------|----------|-------|
| 商品閲覧 | ✅ | ✅ |
| 商品購入 | ✅ | ✅ |
| カート機能 | ✅ | ✅ |
| 注文履歴 | ✅ | ✅ |
| 商品管理 | ❌ | ✅ |
| 在庫管理 | ❌ | ✅ |
| ユーザー管理 | ❌ | ✅ |
| 管理画面 | ❌ | ✅ |
| POS機能 | ❌ | ✅ |

### フロントエンド認証チェック

```typescript
// コンポーネントでの認証状態確認
import { useSession } from 'next-auth/react';

function AdminOnlyComponent() {
  const { data: session } = useSession();
  
  if (!session?.user?.role === 'ADMIN') {
    return <div>アクセス権限がありません</div>;
  }
  
  return <div>管理者限定コンテンツ</div>;
}
```

### API認証チェック

```typescript
// API エンドポイントでの認証
import { getServerSession } from 'next-auth';

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json(
      { error: 'ログインが必要です' },
      { status: 401 }
    );
  }
  
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json(
      { error: '管理者権限が必要です' },
      { status: 403 }
    );
  }
  
  // 管理者限定処理
}
```

## 🛠️ 認証システムのカスタマイズ

### 新しいロールの追加

1. **Prismaスキーマ更新**
   ```prisma
   enum UserRole {
     CUSTOMER
     ADMIN
     STAFF     // 新しいロール
   }
   ```

2. **データベースマイグレーション**
   ```bash
   npx prisma db push
   ```

3. **認証ロジック更新**
   ```typescript
   // 権限チェック関数
   export const hasPermission = (userRole: string, requiredRole: string) => {
     const roleHierarchy = {
       CUSTOMER: 1,
       STAFF: 2,
       ADMIN: 3
     };
     
     return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
   };
   ```

### カスタムプロバイダーの追加

NextAuth.jsは以下のプロバイダーをサポート：
- Google OAuth
- GitHub OAuth  
- Facebook Login
- Twitter OAuth
- Apple Sign In

## 📱 開発・テスト手順

### ローカル環境でのテスト

1. **管理者機能テスト**
   ```bash
   # 管理者でログイン
   email: admin@test.com
   password: admin123
   
   # アクセステスト
  `config.getBaseUrl()`/admin
   ```

2. **一般ユーザー機能テスト**
   ```bash
   # 顧客でログイン  
   email: customer@test.com
   password: customer123
   
   # アクセステスト
  `config.getBaseUrl()`/shop
   ```

3. **認証API テスト**
   ```bash
   # ログイン API
  curl -X POST `config.getBaseUrl()`/api/auth/signin \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@test.com","password":"admin123"}'
   ```

### セッション状態の確認

```typescript
// ブラウザ開発者ツールで実行
console.log('Session:', await fetch('/api/auth/session').then(r => r.json()));
```

## 🚨 重要な注意事項

### 本番環境への移行時

1. **環境変数の変更**
   ```env
   NEXTAUTH_URL="https://yourdomain.com"
   NEXTAUTH_SECRET="production-strong-secret"
   ```

2. **テストアカウントの削除**
   - 本番環境では必ずテストアカウントを削除
   - または強力なパスワードに変更

3. **HTTPS の強制**
   - 認証情報は必ずHTTPS経由で送信
   - HTTP環境では認証が正常に動作しない可能性

### セキュリティチェックリスト

- [ ] 強力なNextAuthSecret設定
- [ ] HTTPS通信の確保  
- [ ] テストアカウントの本番削除
- [ ] パスワード要件の強化
- [ ] セッションタイムアウトの適切な設定
- [ ] APIエンドポイントの認証チェック
- [ ] ロール権限の適切な実装

---

このガイドに従って認証システムを正しく理解し、安全なアプリケーション運用を行ってください。
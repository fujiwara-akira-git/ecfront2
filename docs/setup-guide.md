# Eagle Palace EC - セットアップガイド

このドキュメントは、Eagle Palace ECプロジェクトを他の開発者がローカル環境にセットアップするための完全なガイドです。

## 📋 目次

1. [必要な環境](#必要な環境)
2. [プロジェクトのクローン](#プロジェクトのクローン)
3. [データベースのセットアップ](#データベースのセットアップ)
4. [環境変数の設定](#環境変数の設定)
5. [パッケージのインストール](#パッケージのインストール)
6. [データベースの初期化](#データベースの初期化)
7. [アプリケーションの起動](#アプリケーションの起動)
8. [テストユーザー](#テストユーザー)
9. [トラブルシューティング](#トラブルシューティング)

## 💻 必要な環境

以下のソフトウェアがインストールされている必要があります：

- **Node.js**: v18.0.0以上
- **npm**: v8.0.0以上
- **PostgreSQL**: v13.0以上
- **Git**: v2.0.0以上

### 環境確認コマンド

```bash
node --version
npm --version
psql --version
git --version
```

## 🚀 プロジェクトのクローン

```bash
# プロジェクトをクローン
git clone https://github.com/fujiwara-akira-git/ecfront.git

# プロジェクトディレクトリに移動
cd ecfront
```

## 🗄️ データベースのセットアップ

### PostgreSQLサーバーの起動

**macOS (Homebrew)**:
```bash
brew services start postgresql
```

**Windows**:
```bash
# PostgreSQL サービスを開始（管理者権限で実行）
net start postgresql-x64-13
```

**Linux (Ubuntu/Debian)**:
```bash
sudo service postgresql start
```

### データベースの作成

```bash
# PostgreSQLにログイン（デフォルトユーザー）
psql -U postgres

# データベースを作成
CREATE DATABASE ep_dev;

# ユーザーを作成（オプション）
CREATE USER ep_user WITH PASSWORD 'your_password_here';
GRANT ALL PRIVILEGES ON DATABASE ep_dev TO ep_user;

# PostgreSQLを終了
\q
```

## 🔧 環境変数の設定

プロジェクトルートに `.env.local` ファイルを作成します：

```bash
# .env.local ファイルを作成
touch .env.local
```

`.env.local` に以下の内容を追加：

```env
# データベース接続文字列
# postgres://ユーザー名:パスワード@ホスト:ポート/データベース名
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/ep_dev"

# NextAuth設定
NEXTAUTH_URL="config.getBaseUrl()"
NEXTAUTH_SECRET="your-nextauth-secret-key-here"

# 開発環境設定
NODE_ENV="development"
```

### NEXTAUTH_SECRETの生成

安全なシークレットキーを生成：

```bash
# macOS/Linux
openssl rand -base64 32

# Windows (PowerShell)
[System.Web.Security.Membership]::GeneratePassword(32, 0)
```

生成された文字列を `NEXTAUTH_SECRET` に設定してください。

## 📦 パッケージのインストール

```bash
# 依存関係をインストール
npm install

# Prismaクライアントを生成
npx prisma generate
```

## 🛠️ データベースの初期化

### 1. データベーススキーマの適用

```bash
# Prismaスキーマをデータベースに適用
npx prisma db push
```

### 2. 初期データの投入

```bash
# シードデータを実行
npm run seed
```

シード実行後、以下のデータが作成されます：

#### 商品データ
- **朝どり新鮮レタス** (¥280) - 田中農園
- **完熟トマト** (¥450) - 鈴木農場  
- **甘い人参** (¥320) - 佐藤ファーム
- **旬のきゅうり** (¥200) - 山田野菜園
- **今日の特選野菜セット** (¥1,200) - Eagle Palace農園

#### テストユーザー
- **管理者**: `admin@test.com` / `admin123`
- **顧客**: `customer@test.com` / `customer123`

### 3. データベース状態の確認

```bash
# Prisma Studio でデータを確認（オプション）
npx prisma studio
```

ブラウザで `http://localhost:5555` を開いてデータを確認できます。

## 🚀 アプリケーションの起動

```bash
# 開発サーバーを起動
npm run dev
```

アプリケーションが `config.getBaseUrl()` で起動します。

## 👥 テストユーザー

### 管理者ユーザー
- **メールアドレス**: `admin@test.com`
- **パスワード**: `admin123`
- **権限**: 管理者機能へのフルアクセス
- **アクセス先**: 管理画面は現在利用不可です（内部運用のみ）

### 一般顧客ユーザー
- **メールアドレス**: `customer@test.com`
- **パスワード**: `customer123`
- **権限**: 商品購入、カート機能
- **アクセス先**: `/shop` (ショップ画面)

## 🔍 動作確認

以下のURLで各機能をテストできます：

1. **ホームページ**: `config.getBaseUrl()`
2. **商品一覧**: `config.getBaseUrl()`/shop/products
3. **ログイン画面**: `config.getBaseUrl()`/shop/auth/signin
4. **管理画面**: 管理画面は現在利用不可です（内部運用のみ）
5. **データベーステスト**: `config.getBaseUrl()`/api/test/db

## 🛠️ トラブルシューティング

### データベース接続エラー

**エラー**: `Connection refused` または `ECONNREFUSED`

**解決策**:
1. PostgreSQLサーバーが起動しているか確認
2. `.env.local` のDATABASE_URLが正しいか確認
3. データベース名、ユーザー名、パスワードが正確か確認

```bash
# PostgreSQL接続テスト
psql -U postgres -d ep_dev -h localhost
```

### Prismaエラー

**エラー**: `Prisma Client is not ready yet`

**解決策**:
```bash
# Prismaクライアントを再生成
npx prisma generate

# データベーススキーマを再同期
npx prisma db push
```

### ポートエラー

**エラー**: `Port 3000 is already in use`

**解決策**:
```bash
# プロセスを確認
lsof -i :3000

# プロセスを終了
kill -9 <PID>

# または別のポートで起動
npm run dev -- -p 3001
```

### シードエラー

**エラー**: シード実行時にエラーが発生

**解決策**:
```bash
# 既存データを削除（注意：全データが削除されます）
npx prisma db push --force-reset

# シードを再実行
npm run seed
```

## 📁 プロジェクト構造

```
├── app/                    # Next.js App Router
│   ├── api/               # API エンドポイント
│   ├── admin/             # 管理画面
│   ├── shop/              # ショップ画面
│   └── contexts/          # React Context
├── prisma/                # データベース関連
│   ├── schema.prisma      # データベーススキーマ
│   └── seed.ts           # 初期データ
├── lib/                   # ユーティリティ
├── docs/                  # ドキュメント
└── public/               # 静的ファイル
```

## 🔄 データベース管理コマンド

```bash
# スキーマの変更を適用
npx prisma db push

# マイグレーション作成（本番用）
npx prisma migrate dev --name "migration_name"

# データベースリセット
npx prisma db push --force-reset

# シードデータ再実行
npm run seed

# Prisma Studio起動
npx prisma studio
```

## 🚨 重要な注意事項

1. **環境変数**: `.env.local` ファイルは絶対にGitにコミットしないでください
2. **データベース**: 本番環境では強力なパスワードを使用してください
3. **シークレット**: `NEXTAUTH_SECRET` は安全な方法で生成・管理してください
4. **ポート**: デフォルトポート3000が使用中の場合、自動的に別のポートが使用されます
5. **データ**: 開発中のデータベースリセットは全データを削除するため注意してください

## 📞 サポート

セットアップで問題が発生した場合：

1. このドキュメントのトラブルシューティング項目を確認
2. GitHub Issues で既知の問題をチェック
3. 新しい Issue を作成して詳細を報告

---

**Happy Coding! 🎉**
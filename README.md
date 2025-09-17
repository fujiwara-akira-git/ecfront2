# Eagle Palace EC

埼玉県産の新鮮な農産物を販売するモダンなECプラットフォームです。

## � クイックスタート

```bash
# プロジェクトをクローン
git clone https://github.com/fujiwara-akira-git/ecfront.git
cd ecfront

# 依存関係をインストール
npm install

# 環境変数を設定
cp .env.local.example .env.local
# .env.local を編集してデータベース接続情報等を設定

# データベースを初期化
npx prisma db push
npm run seed

# 開発サーバーを起動
npm run dev
```

アプリケーションが `http://localhost:3000` で起動します。

## 📋 テストユーザー

```bash
# 管理者
Email: admin@test.com
Password: admin123

# 一般顧客
Email: customer@test.com  
Password: customer123
```

## 📚 詳細ドキュメント

包括的なドキュメントは `/docs` フォルダにあります：

- **[セットアップガイド](./docs/setup-guide.md)** - 環境構築の詳細手順
- **[認証ガイド](./docs/authentication-guide.md)** - ユーザー認証システム
- **[データベースガイド](./docs/database-migration.md)** - DB構造と移行詳細
- **[開発ガイドライン](./docs/development-guidelines.md)** - 開発・運用のベストプラクティス
- **[ドキュメント一覧](./docs/README.md)** - 全ドキュメントの詳細索引

- **[リファクタ計画](./docs/REFACTOR_PLAN.md)** - 今後のリファクタ計画と手順
- **[配送ドキュメント](./docs/delivery.md)** - 配送プロバイダ実装の詳細

## 🔧 技術スタック

### フロントエンド

- **Next.js 15.5.2**: App Router, TypeScript
- **React 19**: フック、コンテキスト
- **Tailwind CSS**: レスポンシブUI
- **NextAuth.js**: 認証システム

### バックエンド

- **Prisma ORM 6.15.0**: データベースORM
- **PostgreSQL**: リレーショナルデータベース
- **Next.js API Routes**: REST API

### 開発ツール

- **TypeScript**: 型安全性
- **Git**: バージョン管理
- **npm**: パッケージ管理

## 🎉 主要機能

- � **ハイブリッドカート**: ログイン状態に応じた保存方式切替
- 👤 **ユーザー認証**: 顧客・管理者のロールベース認証
- 📦 **リアルタイム在庫管理**: 在庫数の即座反映
- 💳 **注文管理**: 完全な購買フロー
- 📱 **レスポンシブデザイン**: モバイル対応
- 🔐 **セキュア決済**: 安全な決済システム

## 🏗️ アーキテクチャ

### データベース設計

- **ユーザー管理**: 顧客・管理者の権限分離
- **商品マスタ**: カテゴリ・生産者・商品の階層管理
- **在庫システム**: リアルタイム在庫追跡
- **注文システム**: 注文・決済・配送の完全管理
- **カートシステム**: ローカルストレージ + データベースのハイブリッド

### セキュリティ

- JWT認証とセッション管理
- パスワードハッシュ化（bcryptjs）
- CSRF保護（NextAuth.js内蔵）
- 環境変数による機密情報管理


## 🚀 デプロイ・クラウドテスト

### 開発環境

```bash
npm run dev  # http://localhost:3000
```

### 本番環境

```bash
npm run build
npm start
```

### クラウド環境でのテスト

Vercel上の本番環境でテストする場合は、以下URLにアクセスしてください：

```
https://ecfront-main2.vercel.app
```

※ テスト・検証は必ずVercelの `ecfront-main2` デプロイURLで行ってください。

## 🛠️ よく使うコマンド

```bash
# データベース管理
npx prisma studio          # データベースGUI
npx prisma db push         # スキーマ適用
npm run seed              # テストデータ投入

# 開発
npm run dev               # 開発サーバー
npm run build             # プロダクションビルド
npm run lint              # リント実行
```

## 🆘 トラブルシューティング

### よくある問題

1. **データベース接続エラー** → [セットアップガイド](./docs/setup-guide.md#トラブルシューティング)
2. **ログインできない** → [認証ガイド](./docs/authentication-guide.md#テストユーザーアカウント)
3. **本番環境エラー** → [開発ガイドライン](./docs/development-guidelines.md#緊急対応手順)

## � ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 🤝 コントリビューション

プルリクエストを歓迎します！詳細は[開発ガイドライン](./docs/development-guidelines.md)をご確認ください。

---

Happy Development! 🚀

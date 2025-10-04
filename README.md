# Eagle Palace EC

埼玉県産の新鮮な農産物を販売するモダンなECプラットフォームです。

## 🧹 2025/09/27 一時ファイル・検証用ファイル整理

`tmp/`, `test-results/`, `playwright-report/`, `debug-cart.js`, `test-webhook.js`, `cookies.txt`, `db-backup-20250915.sql`, `Ready!` など不要な一時ファイル・検証用ファイルを削除しました。

運用・開発に不要なファイルは定期的に整理し、リポジトリの保守性を高めています。

## 最新ドキュメント
主要な運用・開発手順は `docs/` フォルダおよび下記リンクにまとめています。

**[リファクタ計画](./docs/REFACTOR_PLAN.md)**
**[セットアップガイド](./docs/setup-guide.md)**
**[認証ガイド](./docs/authentication-guide.md)**
**[DB移行ガイド](./docs/database-migration.md)**
**[開発ガイドライン](./docs/development-guidelines.md)**
**[配送ドキュメント](./docs/delivery.md)**
**[ローカルHTTPS手順](./docs/local-https.md)**

## 📁 ディレクトリ構成（2025/09/27時点）

```
ecfront-main2/
├── app/                # Next.jsアプリ本体（API, UI, 管理画面など）
├── admin/              # 管理者用ページ
├── lib/                # 共通ロジック・APIクライアント・プロバイダ
├── prisma/             # Prismaスキーマ・マイグレーション・シード
├── public/
│   └── images/         # 画像（hero, products等サブフォルダ化）
├── scripts/            # 運用・メンテ・データ移行スクリプト
│   └── legacy/         # 古い/一時的なスクリプト
├── docs/
│   ├── architecture/   # 設計・ER図・技術仕様
│   ├── api/            # API仕様
│   └── ...             # 運用・開発ガイド
├── tests/              # E2E・統合テスト
├── __tests__/          # ユニットテスト
├── types/              # 型定義
├── .github/            # CI/CD・GitHub Actions
├── .next/              # Next.jsビルド成果物（.gitignore管理）
├── ...                 # その他設定・環境ファイル
```

各ディレクトリの詳細・運用方針は `docs/` 配下のドキュメントを参照してください。

## 📁 ディレクトリ詳細・運用ルール

### app/
Next.js本体。APIルート、UI、管理画面、認証など。新規機能は原則ここに追加。

### admin/
管理者用ページ。運用管理・商品管理・注文管理など。

### lib/
共通ロジック、APIクライアント、外部サービス連携。新規プロバイダやユーティリティはここに追加。

### prisma/
Prisma ORMのスキーマ・マイグレーション・シード。DB構造変更は必ずスキーマ・マイグレーションを更新。

### public/images/
画像ファイル。用途別サブフォルダ（hero, products等）を推奨。不要画像は定期削除。

### scripts/
運用・メンテ・データ移行スクリプト。legacy/は古い・一時的なスクリプト。新規運用スクリプトはscripts/直下に追加。

### docs/
運用・開発・設計・API仕様などのドキュメント。architecture/は設計・ER図、api/はAPI仕様。ドキュメントは常に最新化。

### tests/・__tests__/
E2E・統合テストはtests/、ユニットテストは__tests__/。テスト追加時は用途に応じて配置。

### types/
型定義。NextAuthやグローバル型などはここに集約。

### .github/
CI/CD・GitHub Actions。運用自動化・品質管理の設定。

### .next/
Next.jsビルド成果物。git管理外（.gitignore）。

### その他
環境ファイル（.env, .env.local等）はgit管理・漏洩に注意。

---

#### 運用ルール
- 不要ファイル・一時ファイルは定期的に削除
- ドキュメント・READMEは常に最新化
- 新規機能・スクリプトは用途別ディレクトリに追加
- DB構造変更は必ずprismaスキーマ・マイグレーションを更新
- 画像・データは用途別サブフォルダ化
- テストはtests/・__tests__/に用途別配置

## 📚 各ディレクトリのベストプラクティス

### app/
- 機能追加・修正は必ずPR・レビューを経て反映
- APIルートはapp/api/配下に集約
- UIコンポーネントはapp/components/へ
- ページ/ルートごとにサブディレクトリ化

### lib/
- 共通ロジックは再利用性・テスト容易性を意識
- 外部API連携はlib/providers/へ
- 設定値・環境変数はlib/config.tsで一元管理

### prisma/
- DB構造変更は必ずschema.prisma・migrations/を更新
- seedデータはprisma/seed.tsで管理
- 本番・開発DBの差分はmigrationで吸収

### public/images/
- 画像は用途別サブフォルダ（hero, products等）へ
- 不要画像は定期的に削除
- 画像最適化（サイズ・フォーマット）を推奨

### scripts/
- 運用・メンテスクリプトはscripts/直下に
- legacy/は一時的・古いスクリプトのみ
- スクリプトには必ずコメント・利用手順を記載

### docs/
- ドキュメントは常に最新化
- 設計・API仕様はarchitecture/・api/へ分割
- 運用・開発ガイドはREADME.md・development-guidelines.mdへ

### tests/・__tests__/
- E2E・統合テストはtests/、ユニットテストは__tests__/
- テストは自動化・CI連携を推奨
- テスト追加時は用途・粒度に応じて配置

### types/
- 型定義は用途別ファイルに分割
- グローバル型・外部型拡張はtypes/直下に

### .github/
- CI/CD・自動化はGitHub Actionsで管理
- ワークフローは分割・命名規則を徹底

### .next/
- ビルド成果物はgit管理外（.gitignore）
- 不要キャッシュは定期削除

### その他
- 環境ファイルは漏洩・誤コミットに注意
- 機密情報は必ず.env.local等で管理

...existing code...

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

アプリケーションが `config.getBaseUrl()` で起動します（開発時の既定は `http://localhost:3001`）。

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

- **[Operations & Recent Actions](./docs/operations.md)** - Recent debugging and maintenance notes (webhook logs, signature verification, deletion results)

- **[リファクタ計画](./docs/REFACTOR_PLAN.md)** - 今後のリファクタ計画と手順
- **[配送ドキュメント](./docs/delivery.md)** - 配送プロバイダ実装の詳細

- **[ローカル HTTPS 手順](./docs/local-https.md)** - 開発時に `https://localhost:3000` を再現する手順（mkcert + proxy 等）

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
npm run dev  # starts at config.getBaseUrl() (default http://localhost:3001)
```

### 本番環境

```bash
npm run build
npm start
```

### クラウド環境でのテスト

Vercel上の本番環境でテストする場合は、以下URLにアクセスしてください：

```text
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

# Local restore and temporary password steps

This file documents safe steps to set a temporary password for an existing user in the local development database.

Steps:

1. Backup the database (recommended):

```bash
pg_dump "postgresql://dev:dev@127.0.0.1:5432/dev" -Fc -f dev-backup.dump
```

1. Verify the target user exists and see current state:

```bash
psql "postgresql://dev:dev@127.0.0.1:5432/dev" -c "SELECT id, email, (password IS NOT NULL) AS has_password FROM \"User\" WHERE lower(email) = 'customer2@example.com';"
```

1. Apply temporary password (example):

Replace `<BCRYPT_HASH>` with the generated hash printed by the earlier step.

```bash
psql "postgresql://dev:dev@127.0.0.1:5432/dev" -c "UPDATE \"User\" SET password = '<BCRYPT_HASH>' WHERE lower(email) = 'customer2@example.com';"
```

1. Notify user of temporary password and force password reset when appropriate.

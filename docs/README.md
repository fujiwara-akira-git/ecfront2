# Eagle Palace EC - ドキュメント一覧

2025/09/27 一時ファイル・検証用ファイル整理済み。不要な一時ファイルは削除し、運用・開発ドキュメントを最新化しています。

Eagle Palace ECプロジェクトの包括的なドキュメント集です。

## 📚 主要ドキュメント

### 🚀 セットアップ関連

#### [setup-guide.md](./setup-guide.md)
プロジェクトの初回セットアップガイド

**対象**: 新規開発者・プロジェクト参加者

**内容**:
- 必要な環境の準備
- プロジェクトクローンから起動までの手順
- データベース初期化
- 動作確認方法

#### [database-migration.md](./database-migration.md)
データベース移行の詳細ガイド

**対象**: システム理解が必要な開発者・管理者

**内容**:
- 静的データからDB移行の背景
- スキーマ設計思想
- ハイブリッドカートシステムの仕組み
- 移行前後の比較

#### [authentication-guide.md](./authentication-guide.md)
ユーザー認証システムの完全ガイド

**対象**: 認証機能の理解・カスタマイズが必要な開発者

**内容**:
- テストユーザーアカウント情報
- 認証フロー詳細
- ロールベース認証
- セキュリティ実装

#### [development-guidelines.md](./development-guidelines.md)
開発・運用のベストプラクティス

**対象**: プロジェクトメンテナンス担当者・運用チーム

**内容**:
- セキュリティ注意事項
- デプロイメント手順
- パフォーマンス最適化
- 緊急対応手順

## 🎯 用途別ドキュメント選択ガイド

### 初回セットアップ時

1. **[setup-guide.md](./setup-guide.md)** - 必読
2. **[authentication-guide.md](./authentication-guide.md)** - ログイン情報確認用

### システム理解を深めたい時

1. **[database-migration.md](./database-migration.md)** - DB構造理解
2. **[authentication-guide.md](./authentication-guide.md)** - 認証システム理解

### 開発・運用で困った時

1. **[development-guidelines.md](./development-guidelines.md)** - トラブルシューティング
2. **[setup-guide.md](./setup-guide.md)** - 基本的な環境問題

### カスタマイズ・拡張時

1. **[authentication-guide.md](./authentication-guide.md)** - 認証カスタマイズ
2. **[database-migration.md](./database-migration.md)** - スキーマ拡張
3. **[development-guidelines.md](./development-guidelines.md)** - 開発ワークフロー

## 📋 クイックリファレンス

### 重要なコマンド

```bash
# 開発サーバー起動
npm run dev

# データベース初期化
npx prisma db push
npm run seed

# 本番ビルド
npm run build

# データベース管理
npx prisma studio
```

### テストユーザー

```bash
# 管理者
admin@test.com / admin123

# 一般顧客  
customer@test.com / customer123
```

### 重要なURL

```bash
# 開発環境
`config.getBaseUrl()`          # ホーム
`config.getBaseUrl()`/shop     # ショップ
`config.getBaseUrl()`/admin    # 管理画面
```

## 🆘 困った時は

### よくある問題

1. **データベース接続エラー**
   → [setup-guide.md - トラブルシューティング](./setup-guide.md#トラブルシューティング)

2. **ログインできない**  
   → [authentication-guide.md - テストユーザー](./authentication-guide.md#テストユーザーアカウント)

3. **カートが動作しない**
   → [database-migration.md - ハイブリッドカート](./database-migration.md#ハイブリッドカートシステムの実装)

4. **本番環境エラー**
   → [development-guidelines.md - 緊急対応](./development-guidelines.md#緊急対応手順)

### サポート手順

1. 該当ドキュメントのトラブルシューティング項目を確認
2. GitHub Issues で既知問題をチェック
3. 新規 Issue 作成（詳細な環境情報を含める）

## 📚 追加ドキュメント

### レガシー・参考ドキュメント

以下のドキュメントは開発途中の設計資料や参考情報です：

- [system-design.md](./system-design.md) - システム設計資料
- [technical-specs.md](./technical-specs.md) - 技術仕様
- [requirements.md](./requirements.md) - 要件定義
- [er-diagram.md](./er-diagram.md) - ER図
- [sequence-diagrams.md](./sequence-diagrams.md) - シーケンス図

### 外部サービス連携

- [firebase.md](./firebase.md) - Firebase設定
- [payments.md](./payments.md) - 決済システム
- [freee-integration.md](./freee-integration.md) - freee会計連携
- [cloudservice.md](./cloudservice.md) - クラウドサービス

### 開発・テスト環境

- [emulator.md](./emulator.md) - エミュレータ設定
- [ngrok.md](./ngrok.md) - ngrok設定
- [firebase-setup.md](./firebase-setup.md) - Firebase詳細設定

## 📝 ドキュメント更新履歴

### v1.0.0 (2024-12-06)

- 初回ドキュメント作成
- 4つの主要ガイド完成
- セットアップから運用まで包括的にカバー

### 今後の更新予定

- API リファレンス
- コンポーネントライブラリ仕様
- テスト戦略ガイド
- デプロイメント自動化

---

**プロジェクトの詳細は [メインREADME](../README.md) をご確認ください。**

# scripts/ ディレクトリ運用ガイド

## 概要
運用・メンテナンス・データ移行・検証用のスクリプトを管理するディレクトリです。

## 構成
- scripts/maintenance/ : 本番運用・DBメンテ・移行用
- scripts/legacy/      : 古い/一時的/検証用スクリプト（原則削除・保管のみ）
- scripts/README.md    : 本ガイド

## ベストプラクティス
- 新規スクリプトは scripts/ 直下または maintenance/ に追加
- legacy/ には原則追加しない（不要になったもののみ一時保管）
- スクリプトには必ずコメント・利用手順・注意事項を記載
- 本番DB・データ操作系は必ず事前バックアップ・テストを実施
- 不要スクリプトは定期的に削除

## 代表的な用途
- データ移行・バックフィル
- 本番/検証環境のメンテナンス
- Stripe/Prisma/DB連携の検証
- 一時的なバッチ処理

## 注意事項
- 本番環境での実行は十分に検証・レビューを行うこと
- 機密情報・認証情報は .env.local などで管理し、スクリプト内に直書きしない
- 失敗時のロールバック・復旧手順も事前に確認

## 追加・削除・運用ルール
- scripts/README.md を常に最新化
- 追加時はPR・レビューを推奨
- 削除時は履歴・影響範囲を確認

---

運用・保守・開発の効率化のため、スクリプト管理・整理を徹底してください。
# scripts/ — Utility scripts for maintenance and debugging

このフォルダには開発・運用で使う小さなスクリプトが並んでいます。多くは ad-hoc なツールなので実行前に内容を確認してください。

安全性の注意:

主要スクリプトの一覧（抜粋）:

- データを変更するスクリプトは `--dry-run` / `--confirm` をサポートするものがあります。
- 実際に削除・変更を行う前にデータベースのバックアップを推奨します。

- `delete-myproduct-products.js` — 名前に `myproduct` を含む商品を検索・削除。`--dry-run` と `--confirm` 対応。出力: `tmp/delete-myproduct-results.jsonl`。
- `scripts/verify-webhook-signatures.js` — （tmp に存在する場合）`tmp/stripe-webhook-matches.jsonl` を検証して `tmp/stripe-webhook-signature-verification.jsonl` を生成します（`STRIPE_WEBHOOK_SECRET` 必須）。
- `replay-stripe-webhooks.js` — 収集済み webhook を再送してハンドラを検証します。
- `run-stripe-handler-directly.*` — webhook ハンドラをローカルで直接実行するためのヘルパ群（js / mjs / ts あり）。
- `ensure-inventory.js` / `ensure-wst-item-inventory.js` — 在庫関連の整合性チェック/補正ツール。
- `backfill-stripe-ids.*` — 既存データに Stripe invoice/session id を backfill するツール（ts/js あり）。
- `dump-latest-stripe-event.js` / `extract_*` / `diagnose-order-mismatch.js` — Stripe / 注文のデバッグ用ツール。

- 希望があれば自動で整理（ファイル移動）を行います。実行すると既存パスが変わるので、その点に同意してください。
- 各スクリプトを実行可能性チェック（node 実行でエラーが出るものをリスト）も行えます。

次のステップ:

- 何もせずドキュメントのみ追加（完了）
- 指定ルールで自動移動（例: ops/dev/archive の作成と移動）
- 実行互換性チェック（node での実行テスト）

アーカイブ済ファイル（scripts/archive/）:

- `apply_prod_migration.sh`
# scripts/ — Utility scripts for maintenance and debugging

このフォルダには開発・運用で使う小さなスクリプトが並んでいます。多くは ad-hoc なツールなので、実行前に内容を必ず確認してください。

安全性の注意:

- データを変更するスクリプトは `--dry-run` / `--confirm` をサポートするものがあります。
- 実際に削除・変更を行う前にデータベースのバックアップを推奨します。

主要スクリプトの一覧（抜粋）:

- `delete-myproduct-products.js` — 名前に `myproduct` を含む商品を検索・削除。`--dry-run` と `--confirm` 対応。出力: `tmp/delete-myproduct-results.jsonl`。
- `tmp/verify-webhook-signatures.js` — `tmp/stripe-webhook-matches.jsonl` を検証して `tmp/stripe-webhook-signature-verification.jsonl` を生成します（`STRIPE_WEBHOOK_SECRET` 必須）。
- `replay-stripe-webhooks.js` — 収集済み webhook を再送してハンドラを検証します。
- `run-stripe-handler-directly.*` — webhook ハンドラをローカルで直接実行するためのヘルパ群（js / mjs / ts あり）。
- `ensure-inventory.js` / `ensure-wst-item-inventory.js` — 在庫関連の整合性チェック/補正ツール。
- `backfill-stripe-ids.*` — 既存データに Stripe invoice/session id を backfill するツール（ts/js あり）。
- `dump-latest-stripe-event.js` / `extract_*` / `diagnose-order-mismatch.js` — Stripe / 注文のデバッグ用ツール。

- 希望があれば自動で整理（ファイル移動）を行います。実行すると既存パスが変わるので、その点に同意してください。
- 各スクリプトの実行互換性チェック（node での実行テスト）も実行可能です。

運用上の選択肢:

1. 何もせずドキュメントのみ追加（最小変更）
2. 指定ルールで自動移動（例: `scripts/ops/`, `scripts/dev/`, `scripts/archive/` の作成と移動）
3. 実行互換性チェック（node での実行テスト）

アーカイブ済ファイル（`scripts/archive/`）:

- `apply_prod_migration.sh`
# scripts/ — Utility scripts for maintenance and debugging

このフォルダには開発・運用で使う小さなスクリプトが並んでいます。多くは ad-hoc なツールなので、実行前に内容を必ず確認してください。

安全性の注意

- データを変更するスクリプトは `--dry-run` / `--confirm` をサポートするものがあります。
- 実際に削除・変更を行う前にデータベースのバックアップを推奨します。

主要スクリプトの一覧（抜粋）

- `delete-myproduct-products.js` — 名前に `myproduct` を含む商品を検索・削除。`--dry-run` と `--confirm` 対応。出力: `tmp/delete-myproduct-results.jsonl`。
- `tmp/verify-webhook-signatures.js` — `tmp/stripe-webhook-matches.jsonl` を検証して `tmp/stripe-webhook-signature-verification.jsonl` を生成します（`STRIPE_WEBHOOK_SECRET` 必須）。
- `replay-stripe-webhooks.js` — 収集済み webhook を再送してハンドラを検証します。
- `run-stripe-handler-directly.*` — webhook ハンドラをローカルで直接実行するためのヘルパ群（js / mjs / ts あり）。
- `ensure-inventory.js` / `ensure-wst-item-inventory.js` — 在庫関連の整合性チェック/補正ツール。
- `backfill-stripe-ids.*` — 既存データに Stripe invoice/session id を backfill するツール（ts/js あり）。
- `dump-latest-stripe-event.js` / `extract_*` / `diagnose-order-mismatch.js` — Stripe / 注文のデバッグ用ツール。

- 希望があれば自動で整理（ファイル移動）を行います。実行すると既存パスが変わるので、その点に同意してください。
- 各スクリプトの実行互換性チェック（node での実行テスト）も実行可能です。

運用上の選択肢

1. 何もせずドキュメントのみ追加（最小変更）
2. 指定ルールで自動移動（例: `scripts/ops/`, `scripts/dev/`, `scripts/archive/` の作成と移動）
3. 実行互換性チェック（node での実行テスト）

アーカイブ済ファイル（`scripts/archive/`）

- `apply_prod_migration.sh`
# scripts/ — Utility scripts for maintenance and debugging

このフォルダには開発・運用で使う小さなスクリプトが並んでいます。多くは ad-hoc なツールなので、実行前に内容を必ず確認してください。

安全性の注意

- データを変更するスクリプトは `--dry-run` / `--confirm` をサポートするものがあります。
- 実際に削除・変更を行う前にデータベースのバックアップを推奨します。

主要スクリプトの一覧（抜粋）

- `delete-myproduct-products.js` — 名前に `myproduct` を含む商品を検索・削除。`--dry-run` と `--confirm` 対応。出力: `tmp/delete-myproduct-results.jsonl`。
- `tmp/verify-webhook-signatures.js` — `tmp/stripe-webhook-matches.jsonl` を検証して `tmp/stripe-webhook-signature-verification.jsonl` を生成します（`STRIPE_WEBHOOK_SECRET` 必須）。
- `replay-stripe-webhooks.js` — 収集済み webhook を再送してハンドラを検証します。
- `run-stripe-handler-directly.*` — webhook ハンドラをローカルで直接実行するためのヘルパ群（js / mjs / ts あり）。
- `ensure-inventory.js` / `ensure-wst-item-inventory.js` — 在庫関連の整合性チェック/補正ツール。
- `backfill-stripe-ids.*` — 既存データに Stripe invoice/session id を backfill するツール（ts/js あり）。
- `dump-latest-stripe-event.js` / `extract_*` / `diagnose-order-mismatch.js` — Stripe / 注文のデバッグ用ツール。

- 希望があれば自動で整理（ファイル移動）を行います。実行すると既存パスが変わるので、その点に同意してください。
- 各スクリプトの実行互換性チェック（node での実行テスト）も実行可能です。

運用上の選択肢

1. 何もせずドキュメントのみ追加（最小変更）
2. 指定ルールで自動移動（例: `scripts/ops/`, `scripts/dev/`, `scripts/archive/` の作成と移動）
3. 実行互換性チェック（node での実行テスト）

アーカイブ済ファイル（`scripts/archive/`）

- `apply_prod_migration.sh`
- `backfill-stripe-ids.js`
- `backfill-stripe-ids.ts`
- `extract_module.js`
# scripts — Utility scripts for maintenance and debugging

このフォルダには開発・運用で使う小さなスクリプトが並んでいます。多くは ad-hoc なツールなので、実行前に内容を必ず確認してください。

## 安全性の注意

- データを変更するスクリプトは `--dry-run` / `--confirm` をサポートするものがあります。
- 実際に削除・変更を行う前にデータベースのバックアップを推奨します。

## 主要スクリプトの一覧（抜粋）

- `delete-myproduct-products.js` — 名前に `myproduct` を含む商品を検索・削除。`--dry-run` と `--confirm` 対応。出力: `tmp/delete-myproduct-results.jsonl`。
- `tmp/verify-webhook-signatures.js` — `tmp/stripe-webhook-matches.jsonl` を検証して `tmp/stripe-webhook-signature-verification.jsonl` を生成します（`STRIPE_WEBHOOK_SECRET` 必須）。
- `replay-stripe-webhooks.js` — 収集済み webhook を再送してハンドラを検証します。
- `run-stripe-handler-directly.*` — webhook ハンドラをローカルで直接実行するためのヘルパ群（js / mjs / ts あり）。
- `ensure-inventory.js` / `ensure-wst-item-inventory.js` — 在庫関連の整合性チェック/補正ツール。
- `backfill-stripe-ids.*` — 既存データに Stripe invoice/session id を backfill するツール（ts/js あり）。
- `dump-latest-stripe-event.js` / `extract_*` / `diagnose-order-mismatch.js` — Stripe / 注文のデバッグ用ツール。

希望があれば自動で整理（ファイル移動）を行います。実行すると既存パスが変わるので、その点に同意してください。

## 運用上の選択肢

1. 何もせずドキュメントのみ追加（最小変更）
2. 指定ルールで自動移動（例: `scripts/ops/`, `scripts/dev/`, `scripts/archive/` の作成と移動）
3. 実行互換性チェック（node での実行テスト）

## アーカイブ済ファイル（`scripts/archive/`）

- `apply_prod_migration.sh`
- `backfill-stripe-ids.js`
- `backfill-stripe-ids.ts`
- `extract_module.js`
- `extract_vendored.js`
- `migrate-neon-to-local.sh`
- `migrate-production.sh`
- `run-stripe-handler-directly.js`
- `run-stripe-handler-directly.mjs`
- `run-stripe-handler-directly.ts`
- `scan_vendored_chunks.js`
- `start-dev-3000.sh`, `start-dev-bg.sh`, `next-https-dev.js` — ローカル開発サーバー起動と HTTPS 周りの支援スクリプト。
- `prisma-*` — Prisma のジェネレート / postinstall 用スクリプト。

## 推奨の整理案

1. `scripts/ops/` に運用用スクリプトを移す（例: `delete-myproduct-products.js`, `replay-stripe-webhooks.js`, `prisma-*`）。
2. `scripts/dev/` に開発用ヘルパを移動（例: `next-https-dev.js`, `start-dev-3000.sh`）。
3. 古いバージョンや重複（`backfill-stripe-ids.js` と `backfill-stripe-ids.ts` 等）は内容を確認の上アーカイブ（`scripts/archive/`）へ移動。
4. ドキュメント化する: 各スクリプトにヘルプ出力（`--help`）がない場合、簡単な実行例を README に追加。

## 進め方の推奨

# scripts — Utility scripts for maintenance and debugging

このフォルダには開発・運用で使う小さなスクリプトが並んでいます。多くは ad-hoc なツールなので、実行前に内容を必ず確認してください。

## 安全性の注意

- データを変更するスクリプトは `--dry-run` / `--confirm` をサポートするものがあります。
- 実際に削除・変更を行う前にデータベースのバックアップを推奨します。

## 主要スクリプトの一覧（抜粋）

- `delete-myproduct-products.js` — 名前に `myproduct` を含む商品を検索・削除。`--dry-run` と `--confirm` 対応。出力: `tmp/delete-myproduct-results.jsonl`。
- `tmp/verify-webhook-signatures.js` — `tmp/stripe-webhook-matches.jsonl` を検証して `tmp/stripe-webhook-signature-verification.jsonl` を生成します（`STRIPE_WEBHOOK_SECRET` 必須）。
- `replay-stripe-webhooks.js` — 収集済み webhook を再送してハンドラを検証します。
- `run-stripe-handler-directly.*` — webhook ハンドラをローカルで直接実行するためのヘルパ群（js / mjs / ts あり）。
- `ensure-inventory.js` / `ensure-wst-item-inventory.js` — 在庫関連の整合性チェック/補正ツール。
- `backfill-stripe-ids.*` — 既存データに Stripe invoice/session id を backfill するツール（ts/js あり）。
- `dump-latest-stripe-event.js` / `extract_*` / `diagnose-order-mismatch.js` — Stripe / 注文のデバッグ用ツール。

希望があれば自動で整理（ファイル移動）を行います。実行すると既存パスが変わるので、その点に同意してください。

## 運用上の選択肢

1. 何もせずドキュメントのみ追加（最小変更）
2. 指定ルールで自動移動（例: `scripts/ops/`, `scripts/dev/`, `scripts/archive/` の作成と移動）
3. 実行互換性チェック（node での実行テスト）

## アーカイブ済ファイル（`scripts/archive/`）

- `apply_prod_migration.sh`
- `backfill-stripe-ids.js`
- `backfill-stripe-ids.ts`
- `extract_module.js`
- `extract_vendored.js`
- `migrate-neon-to-local.sh`
- `migrate-production.sh`
- `run-stripe-handler-directly.js`
- `run-stripe-handler-directly.mjs`
- `run-stripe-handler-directly.ts`
- `scan_vendored_chunks.js`
- `start-dev-3000.sh`, `start-dev-bg.sh`, `next-https-dev.js` — ローカル開発サーバー起動と HTTPS 周りの支援スクリプト。
- `prisma-*` — Prisma のジェネレート / postinstall 用スクリプト。

## 推奨の整理案

1. `scripts/ops/` に運用用スクリプトを移す（例: `delete-myproduct-products.js`, `replay-stripe-webhooks.js`, `prisma-*`）。
2. `scripts/dev/` に開発用ヘルパを移動（例: `next-https-dev.js`, `start-dev-3000.sh`）。
3. 古いバージョンや重複（`backfill-stripe-ids.js` と `backfill-stripe-ids.ts` 等）は内容を確認の上アーカイブ（`scripts/archive/`）へ移動。
4. ドキュメント化する: 各スクリプトにヘルプ出力（`--help`）がない場合、簡単な実行例を README に追加。

## 進め方の推奨

まずは `--dry-run` でテスト実行し、問題がなければ自動移動を検討してください。


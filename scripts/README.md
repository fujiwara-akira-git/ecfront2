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


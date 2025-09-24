 # 手動マイグレーション: add-order-postalcode

 目的:

- `Order` テーブルに `postalCode` カラム（`text`）を追加します。

 手順（安全なワークフロー）:

 1. ローカルで SQL を適用してカラムを追加（既に適用済みの場合はスキップ）:

    ```bash
    psql "$DATABASE_URL" -f prisma/migrations/20250920120000_add-order-postalcode/migration.sql
    ```

 2. 既存データの更新（日本の郵便番号のみを対象に抽出する例）:

    ```bash
    psql "$DATABASE_URL" -c "UPDATE \"Order\" SET \"postalCode\" = regexp_replace(regexp_replace(\"shippingAddress\", '\\D','', 'g'), '(\\d{3})(\\d{4})', '\\1-\\2') WHERE \"postalCode\" IS NULL AND \"shippingAddress\" ~ '\\d{3}-?\\d{4}';"
    ```

 3. Prisma のマイグレーション履歴にこのマイグレーションを登録する（手動）:

    - `prisma migrate resolve --applied 20250920120000_add-order-postalcode` を実行することで、Prisma に対してこのマイグレーションは既に適用済みであるとマークできます。

 注意:

- 本手順はローカル開発環境向けです。本番 DB に適用する場合は必ずバックアップを取得してください。
- Prisma の自動マイグレーション機能が既存の migration history と drift を検出しているため、今回は手動で整合させるアプローチを採っています。

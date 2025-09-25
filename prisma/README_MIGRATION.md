ローカル開発向けマイグレーション手順

1) ローカル DB を起動してください（例: PostgreSQL が localhost:5432 で稼働）
2) Prisma マイグレーションを適用するにはプロジェクトルートで:

```bash
npx prisma migrate deploy
```

または開発環境でインタラクティブに実行する場合:

```bash
npx prisma migrate dev --name add-shipping-fields
```

3) マイグレーション実行後、Prisma Client を再生成してください（既に実行済みの場合は不要）:

```bash
npx prisma generate
```

4) 既存注文の backfill を実行して、新しく追加したフィールドを埋める:

```bash
node scripts/backfill-shipping-fields.js
```

注意:
- マイグレーションはデータベースにスキーマ変更を行います。実運用 DB に適用する前に必ずバックアップをとってください。
- このリポジトリには `db-backup-20250915.sql` が含まれていますが、現在の DB 状態に合わせて必ずバックアップを取得してください。

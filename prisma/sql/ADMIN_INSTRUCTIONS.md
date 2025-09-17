# Applying `add_favorite_producer.sql` (Administrator Instructions)

このファイルはデータベース管理者向けに、`prisma/sql/add_favorite_producer.sql` を安全に適用する手順をまとめたものです。

重要: 本操作は本番データベースに影響を与えます。適用前に必ずデータベースのバックアップを取ってください。

1) 確認

- SQL ファイルの内容を確認してください: `prisma/sql/add_favorite_producer.sql`
- 変更点: 新しいテーブル `FavoriteProducer` の作成、ユニーク制約、インデックス、`User` と `Producer` への外部キー制約を追加します。

2) 事前バックアップ（必須）

-- PostgreSQL (例)
```bash
# スナップショットやエクスポートが可能な環境で実行してください
pg_dump "$DATABASE_URL" -Fc -f ~/db-backups/ecfront_favoriteproducer_before.dump
```

3) 適用方法

-- psql を使う例:
```bash
psql "$DATABASE_URL" -f prisma/sql/add_favorite_producer.sql
```

-- もしくは管理ツール（pgAdmin, Supabase SQL editor, Neon console など）からファイル内容を実行してください。

4) 適用後の確認

-- テーブル存在確認:
```sql
SELECT table_name FROM information_schema.tables WHERE table_name = 'FavoriteProducer';
```

-- 外部キー確認 (例):
```sql
SELECT conname, conrelid::regclass AS table_from, confrelid::regclass AS table_to
FROM pg_constraint
WHERE conname LIKE 'FavoriteProducer_%';
```

-- インデックス確認 (例):
```sql
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'FavoriteProducer';
```

5) ロールバック

問題が発生した場合は次のコマンドでロールバックできます（ただし依存関係に注意してください）:
```sql
DROP TABLE IF EXISTS "FavoriteProducer" CASCADE;
```

6) Prisma をローカルで同期する手順（開発者向け）

管理者が SQL を適用したら、開発者は以下を実行して Prisma Client を更新します

```bash
# 開発マシンで
npx prisma db pull
npx prisma generate
```

7) 注意点

- 本 SQL はデータを変更しません（テーブル作成と制約のみ）。既存の `User` / `Producer` テーブルに問題がある場合、外部キー制約の追加でエラーになります。事前に `User.id` と `Producer.id` の値が正規化されていることを確認してください。
- 本番環境ではメンテナンスウィンドウ中に適用することを推奨します。

質問や不明点があればリポジトリの所有者に連絡してください。

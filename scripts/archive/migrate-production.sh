#!/bin/bash
# 本番データベースマイグレーション実行スクリプト

set -e  # エラー時に停止

echo "🚀 本番データベースマイグレーションを開始します..."

# 環境変数チェック
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL環境変数が設定されていません"
    echo "本番データベースの接続文字列を設定してください"
    exit 1
fi

echo "📊 データベース接続をテスト中..."
npx prisma db ping

echo "🔄 マイグレーションを実行中..."
npx prisma migrate deploy

echo "🔧 Prismaクライアントを生成中..."
npx prisma generate

echo "✅ マイグレーション完了！"
echo "📈 データベース統計:"
npx prisma db execute --stdin <<EOF
SELECT 
    tablename,
    schemaname
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
EOF
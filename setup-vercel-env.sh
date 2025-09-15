#!/bin/bash
# Vercel環境変数設定スクリプト
# 使用方法: ./setup-vercel-env.sh

echo "Vercel環境変数を設定します..."

# データベース
vercel env add DATABASE_URL production
echo "PostgreSQL接続文字列を入力してください"

# Stripe本番キー
vercel env add STRIPE_SECRET_KEY production
echo "Stripe本番Secret Keyを入力してください"

vercel env add STRIPE_WEBHOOK_SECRET production  
echo "Stripe本番Webhook Secretを入力してください"

vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production
echo "Stripe本番Publishable Keyを入力してください"

# アプリURL
vercel env add NEXT_PUBLIC_APP_URL production
echo "本番ドメイン(https://yourdomain.com)を入力してください"

echo "環境変数の設定が完了しました！"
echo "vercel --prod でデプロイしてください"
#!/bin/bash
# Vercel環境変数設定スクリプト (本番用)

echo "🚀 Vercel本番環境変数を設定します..."

# データベース (Neon)
echo "DATABASE_URL を設定中..."
vercel env add DATABASE_URL production <<EOF
postgresql://neondb_owner:npg_yVFsBSP35JKa@ep-mute-fire-a1ec85fd-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
EOF

# Stripe本番キー (実際の値に置換してください)
echo "Stripe環境変数を設定してください:"
echo "1. STRIPE_SECRET_KEY (sk_live_...)"
echo "2. STRIPE_WEBHOOK_SECRET (whsec_...)"
echo "3. NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (pk_live_...)"
echo "4. NEXT_PUBLIC_APP_URL (https://yourdomain.com)"

read -p "Stripe Secret Key (sk_live_...)を入力: " stripe_secret
vercel env add STRIPE_SECRET_KEY production <<EOF
$stripe_secret
EOF

read -p "Stripe Webhook Secret (whsec_...)を入力: " webhook_secret
vercel env add STRIPE_WEBHOOK_SECRET production <<EOF
$webhook_secret
EOF

read -p "Stripe Publishable Key (pk_live_...)を入力: " publishable_key
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production <<EOF
$publishable_key
EOF

read -p "本番ドメイン (https://yourdomain.com)を入力: " app_url
vercel env add NEXT_PUBLIC_APP_URL production <<EOF
$app_url
EOF

echo "✅ 環境変数の設定が完了しました！"
echo "📦 次のコマンドでデプロイしてください:"
echo "npm run build && vercel --prod"
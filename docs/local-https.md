# ローカル HTTPS (mkcert) と検証手順

このドキュメントは開発者がローカルで `https://localhost:3000` を再現し、`Secure` 属性付き Cookie（例: NextAuth のセッション）を検証する手順をまとめたものです。

## 前提
- macOS / Linux / Windows に対応（以下は macOS の例）
- `mkcert` がインストールされていること（未インストールの場合は手順を参照）
- リポジトリに `certs/localhost.pem` と `certs/localhost-key.pem` を配置する想定

## 推奨ワークフロー（安定） — proxy 方式

理由: TLS 終端をプロキシに任せて Next を通常の HTTP（例: `PORT=3001`）で動かすため、HMR/WebSocket が安定します。開発時はこちらを推奨します。

1. 依存をインストール（初回）:

```bash
npm install
```

2. mkcert でローカル証明書を作成（未作成の場合）:

```bash
# mkcert をまだ入れていない場合は Homebrew などでインストール
brew install mkcert nss
mkcert -install
mkdir -p certs
mkcert -key-file certs/localhost-key.pem -cert-file certs/localhost.pem localhost 127.0.0.1 ::1
```

3. Next をポート 3001 で起動（別ターミナル）:

```bash
PORT=3001 npm run dev
```

4. HTTPS プロキシを起動して `https://localhost:3000` を提供（別ターミナル）:

```bash
npm run dev:https:proxy
# スクリプトが無い / 失敗する場合の代替:
# npm run ssl-proxy
```

5. ブラウザで `https://localhost:3000` を開き、開発中のサイトにアクセス。

## 代替方法（実験的） — Next を直接 HTTPS で起動

1. 既に `scripts/next-https-dev.js` が用意されている場合:

```bash
npm run dev:https:direct
```

注意: この方法は単一プロセスで簡潔ですが、HMR（ホットリロード）や WebSocket が不安定になることがあるため、日常的な開発では proxy 方式を推奨します。

## `cross-env` について

package.json の `dev:https` スクリプトは `cross-env PORT=3001 next dev` を使っています。もし `sh: cross-env: command not found` が出る場合は次を実行してください。

```bash
npm install -D cross-env
# あるいは zsh で直接: PORT=3001 npm run dev
```

## 検証手順（Sign-up → 自動ログインの確認）

1. ブラウザで `https://localhost:3000/shop/auth/signup` を開いて会員登録を行う。
2. 登録完了後に `/shop` に遷移し、ヘッダーにユーザ名が表示されることを確認する。
3. 必要に応じて DevTools → Network で `/api/auth/session` を確認し、レスポンスに `user` が含まれていること、また `Set-Cookie` ヘッダが正しく送られていることを確認する。

curl ベースの E2E 簡易検証スクリプト（リポジトリに用意済み）:

```bash
# サイトが https://localhost:3000 で動作していること
./scripts/e2e-register.sh https://localhost:3000
```

成功するとスクリプトは `201` と `200` を返し、`/api/auth/session` の user 情報を表示します。

## 本番（Vercel）への注意点

- `NEXTAUTH_URL` と `NEXTAUTH_SECRET` を本番値に設定してください。これらが JWT 発行／検証に必要です。
- `getServerSession` をレイアウトで使うとサーバサイドレンダリングになり、静的キャッシュの恩恵が減ります。必要な箇所だけで呼ぶことを検討してください。

## トラブルシュート

- Webpack/Next のキャッシュエラーが出る場合はキャッシュを削除して再起動:

```bash
rm -rf .next
PORT=3001 npm run dev
```

- ポート衝突が出たら使用プロセスを特定して終了、または別ポートで起動してください:

```bash
lsof -iTCP:3001 -sTCP:LISTEN -n -P
kill -15 <PID>
```

## 推奨事項（まとめ）

- 日常開発: proxy 方式（`dev:https` + `dev:https:proxy`）を推奨。HMR が安定し、ブラウザで Secure cookie の動作を確認できる。
- 直接 HTTPS: テストやデバッグ用途で一時的に使用するが、HMR の不安定さに注意。
- ドキュメントやデプロイ手順に `NEXTAUTH_*` の環境変数チェックを明記する。

---

ファイル: `docs/local-https.md`
# Local HTTPS for Next (use https://localhost:3000)

This document explains how to run the local dev server so that `https://localhost:3000` is available.

# Local HTTPS for Next (serve https://localhost:3000)

This document explains how to run the local dev server so that `https://localhost:3000` is available.

Prerequisites

- mkcert installed and certs generated in `certs/localhost.pem` and `certs/localhost-key.pem`.

Steps

1. Start Next on port 3001 (so port 3000 can be used for TLS termination):

```bash
# run in one terminal
npm run dev:https
```

2. Start the HTTPS proxy (in another terminal):

```bash
# run in another terminal at project root
npm run dev:https:proxy
```

3. Ensure `.env.local` sets:

```bash
NEXTAUTH_URL=https://localhost:3000
```

4. Restart Next if you changed `.env.local`.

5. Now open `https://localhost:3000` in your browser.

Notes

- The proxy will terminate TLS on port 3000 and forward requests to `http://localhost:3001` where Next runs.
- If the browser complains about the certificate, run `mkcert -install` and re-generate certs.
- You can also run the proxy with different ports by setting `TARGET_PORT` and `LISTEN_PORT` env vars before starting `dev:https:proxy`.

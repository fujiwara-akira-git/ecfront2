# Firebase 設定ガイド

作成日: 2025-09-02

このガイドはローカル開発および本番環境の Firebase 設定手順を示します。

## 前提
- Firebase CLI がインストールされていること（`npm install -g firebase-tools`）
- Firebase プロジェクトを作成済みであること

## ローカル開発（エミュレータ）

1. ルートに `firebase.json` と `.firebaserc` があることを確認
2. エミュレータ起動

```bash
firebase emulators:start --only firestore,functions
```

3. シードを投入（別ターミナル）

```bash
export FIRESTORE_EMULATOR_HOST=localhost:8080
npm run seed:emulator
```

4. Next.js を起動

```bash
npm run dev
```

5. テスト
- Web UI: http://localhost:3000/shop
- API: /api/shipments/register, /api/shipments/complete 等に対して curl で実行

## ローカル Firebase Functions のデバッグ
- functions フォルダに移動して `npm install`（依存に応じて）
- `firebase emulators:start --only functions,firestore` で functions と firestore を同時起動

## 本番設定（Firebase コンソール）

1. Project の作成
2. Firestore のリージョン選定と有効化
3. Functions のデプロイ（Node バージョンはサンプルに合わせる）
4. 環境変数の設定

```bash
firebase functions:config:set freee.client_access_token="YOUR_TOKEN"
```

または、CI の Secret 管理で `FREEE_CLIENT_ACCESS_TOKEN` などを設定する。

## セキュリティと運用
- Firestore ルールの厳格化（admin claim による制御）を実施
- backup の運用（定期エクスポート）を設定

## デプロイ手順（例）

1. push ブランチ → PR → マージ
2. CI が走ってビルドとテストを実行
3. `firebase deploy --only firestore,functions` を実行

## よくある問題とトラブルシューティング
- Emulator で `FIRESTORE_EMULATOR_HOST` が設定されていない場合、seed が失敗します。必ず環境変数を設定してください。
- Functions から Firestore にアクセスする際は `firebase-admin` を利用し、エミュレータでの動作を確認してください。

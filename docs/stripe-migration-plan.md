# Stripe productId migration plan

目的: Stripe Checkout の line_items から作成される `OrderItem` が DB の `Product.id` と一致しないため発生するエラー(P2003)を防止し、将来的なデータ整合性を確保する。

短期対応（実施済）:
- Webhook ハンドラで Stripe の line_items を読み出す際、price.metadata.productId を優先的に使い、見つからない場合は Stripe の product id を候補として使用するロジックを追加。
- 候補が DB の `Product` と一致しない場合は "imported_from_stripe:<candidate>" を description に持つプレースホルダ `Product` を自動作成して FK 制約を満たすようにした。
- プレースホルダ一覧・置換・マッチ候補生成スクリプトを `scripts/` に追加（`list-placeholder-products.js`, `replace-placeholder.js`, `suggest-mappings.js`）。

恒久対応（推奨）:
1. Checkout セッション作成時に `price_data.product_data.metadata.productId` に内部 `Product.id` を入れる運用に変更する。
   - サーバ側で `createCheckoutSession` を組み立てている箇所に既に対応済み。フロント側で price/price_id を直接組むフローがある場合は、管理側で price を作る際に metadata を埋める運用を追加する。
2. 既存 Stripe price/product と内部 Product の対応表を作り、metadata に内部 id を書き込むか移行スクリプトで内部 productId を埋める。
3. 既に作成されたプレースホルダ `Product` を `scripts/suggest-mappings.js` で候補を出し、手動または `scripts/replace-placeholder.js` で置換する。

運用手順（例）:
- 新規: 管理画面で Product を作成後、同時に Stripe Price を作成するときに metadata.productId を指定する。
- 既存: `node scripts/list-placeholder-products.js` でプレースホルダを確認 -> `node scripts/suggest-mappings.js` で候補確認 -> 適切な targetId が決まったら `node scripts/replace-placeholder.js <placeholderId> <targetId> --remove-placeholder` を実行。

注意:
- プレースホルダを削除する前に `orderItem` が正しく置換されていることを必ず確認してください。
- この変更を本番にデプロイする前に Staging 環境で動作確認を行ってください。

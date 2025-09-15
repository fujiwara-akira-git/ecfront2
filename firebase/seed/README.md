Firebase エミュレータ向けシード手順

前提
- Firebase CLI と Emulator がインストールされていること

エミュレータ起動
```
firebase emulators:start --only firestore
```

シード実行
```
# 別ターミナルで
export FIRESTORE_EMULATOR_HOST=localhost:8080
node firebase/seed/seed.js
```

備考: 本番 Firestore に対してスクリプトを実行するとデータが上書きされる可能性があるため、必ずエミュレータに対して実行してください。

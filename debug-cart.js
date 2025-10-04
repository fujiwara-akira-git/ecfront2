// カート機能のデバッグ用テストスクリプト
console.log('カート機能のテスト開始')

// ブラウザでこのスクリプトを実行してカートの状態をテストする
function testCartFunctionality() {
  // CartContextの状態を確認
  if (window.React && window.cartContext) {
    console.log('CartContext state:', window.cartContext.state)
  }
  
  // セッション状態を確認
  console.log('Session status:', window.sessionStatus)
  
  // ローカルストレージのカート状態
  console.log('LocalStorage cart:', localStorage.getItem('cart'))
}

// グローバルに露出してブラウザで実行できるようにする
window.testCartFunctionality = testCartFunctionality
window.debugCart = true

console.log('デバッグ関数が利用可能になりました: testCartFunctionality()')
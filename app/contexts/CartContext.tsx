'use client'

import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import type { Session } from 'next-auth'
import { runWithRetry } from '../../lib/dbWithRetry'

export interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  producerName: string
  description?: string
  stock?: number
  isInStock?: boolean
}

interface CartState {
  items: CartItem[]
  isLoading: boolean
  lastSyncTime: number
}

type CartAction = 
  | { type: 'ADD_ITEM'; payload: Omit<CartItem, 'quantity'> }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'REMOVE_ITEM'; payload: { id: string } }
  | { type: 'CLEAR_CART' }
  | { type: 'LOAD_CART'; payload: CartItem[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SYNC_COMPLETE' }

interface CartContextType {
  state: CartState
  addItem: (item: Omit<CartItem, 'quantity'>) => Promise<void>
  updateQuantity: (id: string, quantity: number) => Promise<void>
  removeItem: (id: string) => Promise<void>
  clearCart: () => Promise<void>
  getItemCount: () => number
  getSubtotal: () => number
  syncWithDatabase: () => Promise<void>
}

const CartContext = createContext<CartContextType | undefined>(undefined)

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingItem = state.items.find(item => item.id === action.payload.id)
      if (existingItem) {
        return {
          ...state,
          items: state.items.map(item =>
            item.id === action.payload.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        }
      }
      return {
        ...state,
        items: [...state.items, { ...action.payload, quantity: 1 }]
      }
    }
    case 'UPDATE_QUANTITY': {
      if (action.payload.quantity <= 0) {
        return {
          ...state,
          items: state.items.filter(item => item.id !== action.payload.id)
        }
      }
      return {
        ...state,
        items: state.items.map(item =>
          item.id === action.payload.id
            ? { ...item, quantity: action.payload.quantity }
            : item
        )
      }
    }
    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter(item => item.id !== action.payload.id)
      }
    case 'CLEAR_CART':
      return {
        ...state,
        items: []
      }
    case 'LOAD_CART':
      return {
        ...state,
        items: action.payload
      }
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      }
    case 'SYNC_COMPLETE':
      return {
        ...state,
        lastSyncTime: Date.now()
      }
    default:
      return state
  }
}

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, { 
    items: [], 
    isLoading: false, 
    lastSyncTime: 0 
  })
  const { data: session, status } = useSession()
  const typedSession = session as Session | null | undefined
  const sessionUserId = typeof typedSession?.user?.id === 'string' ? typedSession.user.id : undefined
  const hasInitialized = useRef(false)
  const syncInProgress = useRef(false)

  console.log('🔄 CartProvider render:', {
    sessionId: sessionUserId,
    status,
    itemsCount: state.items.length,
    lastSyncTime: state.lastSyncTime,
    hasInitialized: hasInitialized.current,
    syncInProgress: syncInProgress.current
  })

  // データベースからカートを読み込み
  const loadCartFromDatabase = useCallback(async () => {
    if (!sessionUserId) return

    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      console.log('📖 データベースからカート読み込み開始')
  const response = await runWithRetry(() => fetch('/api/cart', { credentials: 'same-origin' }), { retries: 2 })
      
      console.log('📖 カート読み込みレスポンス:', { 
        ok: response.ok, 
        status: response.status 
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('📖 読み込んだカートデータ:', data.items?.length, '件')
        dispatch({ type: 'LOAD_CART', payload: data.items || [] })
        dispatch({ type: 'SYNC_COMPLETE' })
      } else {
        console.error('📖 カート読み込み失敗:', response.status)
      }
    } catch (error) {
      console.error('📖 データベースからカート読み込みエラー:', error)
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [sessionUserId])

  // ローカルカートをデータベースに移行
  const migrateLocalCartToDatabase = useCallback(async () => {
    if (!sessionUserId || state.items.length === 0) return

    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      console.log('🚚 ローカルカートのデータベース移行開始:', state.items.length, '件')
      
      const response = await runWithRetry(() => fetch('/api/cart/migrate', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ localCartItems: state.items })
      }), { retries: 2 })

      console.log('🚚 カート移行レスポンス:', { 
        ok: response.ok, 
        status: response.status 
      })

      if (response.ok) {
        const result = await response.json()
        console.log('🚚 カート移行成功:', result)
        
        // 移行失敗したアイテムがあれば詳細を通知
        if (result.hasFailures && result.failedItems && result.failedItems.length > 0) {
          console.warn('⚠️ 移行失敗アイテム:', result.failedItems)
          const failedCount = result.failedItems.length
          const successCount = result.migrated || 0
          
          let message = `カート移行完了: ${result.total}個中${successCount}個が移行されました。\n\n`
          
          if (failedCount > 0) {
            message += `以下の商品で問題が発生しました:\n`
            result.failedItems.forEach((item: string) => {
                message += `• ${item}\n`
              })
            message += `\n※ 削除された商品や在庫不足の商品は自動的にカートから除外されます。`
          }
          
          alert(message)
        } else if (result.migrated > 0) {
          console.log('✅ 全商品移行成功:', result.migrated, '個')
        }
        
        // ローカルストレージをクリア
        if (typeof window !== 'undefined') {
          localStorage.removeItem('cart')
          console.log('🚚 ローカルストレージクリア完了')
        }
        
        // データベースから最新カートを読み込み
        await loadCartFromDatabase()
      } else {
        const errorText = await response.text()
        console.error('🚚 カート移行失敗:', response.status, errorText)
        alert('カートの移行に失敗しました')
      }
    } catch (error) {
      console.error('🚚 カート移行エラー:', error)
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [sessionUserId, state.items, loadCartFromDatabase])

  // ローカルストレージからカートデータを読み込む（未ログイン時）
  useEffect(() => {
    if (sessionUserId && state.items.length > 0 && state.lastSyncTime === 0 && hasInitialized.current) {
      console.log('🔁 ログイン後state.items変化でマイグレーション実行:', state.items.length, '件')
      migrateLocalCartToDatabase()
    }
  }, [sessionUserId, state.items.length, state.lastSyncTime, migrateLocalCartToDatabase])

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated' && typeof window !== 'undefined') {
      const savedCart = localStorage.getItem('cart')
      if (savedCart) {
        try {
          const cartData = JSON.parse(savedCart)
          console.log('💾 ローカルストレージからカート読み込み:', cartData.length, '件')
          dispatch({ type: 'LOAD_CART', payload: cartData })
        } catch (error) {
          console.error('💾 ローカルストレージカート読み込み失敗:', error)
        }
      }
    }
  }, [status])

  // ログイン状態変化時の処理
  useEffect(() => {
    console.log('🔐 ログイン状態変化検知:', {
      status,
      userId: sessionUserId,
      itemsLength: state.items.length,
      lastSyncTime: state.lastSyncTime,
      hasInitialized: hasInitialized.current,
      syncInProgress: syncInProgress.current
    })

  if (status === 'loading' || syncInProgress.current) return

    // 初回ログイン時のみ同期処理を実行
    if (sessionUserId && !hasInitialized.current) {
      syncInProgress.current = true
      // ローカルストレージのcartがあれば一時的にロード
      if (state.items.length === 0 && typeof window !== 'undefined') {
        const savedCart = localStorage.getItem('cart')
        if (savedCart) {
          try {
            const cartData = JSON.parse(savedCart)
            if (cartData.length > 0) {
              console.log('💾 ログイン時にローカルストレージからカート一時ロード:', cartData.length, '件')
              dispatch({ type: 'LOAD_CART', payload: cartData })
              // 一時ロード後にマイグレーション
              migrateLocalCartToDatabase().finally(() => {
                hasInitialized.current = true
                syncInProgress.current = false
              })
              return
            }
          } catch (error) {
            console.error('💾 ログイン時ローカルストレージカート読み込み失敗:', error)
          }
        }
      }
      if (state.items.length > 0 && state.lastSyncTime === 0) {
        // ローカルカートをデータベースに移行
        console.log('🔐 ローカルカート移行を実行')
        migrateLocalCartToDatabase().finally(() => {
          hasInitialized.current = true
          syncInProgress.current = false
  // ログイン後のカートマイグレーションは、上位のuseEffectで一度だけ実行する
        })
      } else if (state.items.length === 0 && state.lastSyncTime === 0) {
        // データベースからカートを読み込み
        console.log('🔐 データベースからカート読み込みを実行')
        loadCartFromDatabase().finally(() => {
          hasInitialized.current = true
          syncInProgress.current = false
        })
      } else {
        hasInitialized.current = true
        syncInProgress.current = false
      }
    } else if (!sessionUserId && hasInitialized.current) {
      // ログアウト時の処理
      console.log('🔐 ログアウト処理、状態リセット')
      hasInitialized.current = false
      syncInProgress.current = false
      if (state.lastSyncTime > 0) {
        dispatch({ type: 'SYNC_COMPLETE' })
      }
    }
  }, [sessionUserId, status, migrateLocalCartToDatabase, loadCartFromDatabase, state.items.length, state.lastSyncTime])

  // カートの変更をローカルストレージに保存（未ログイン時のみ）
  useEffect(() => {
    if (!sessionUserId && typeof window !== 'undefined') {
      localStorage.setItem('cart', JSON.stringify(state.items))
    }
  }, [state.items, sessionUserId])

  // デバッグ用: ローカルストレージをクリアする関数（開発環境のみ）
  const clearLocalCart = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cart')
      dispatch({ type: 'LOAD_CART', payload: [] })
      console.log('🧹 ローカルカートをクリアしました')
    }
  }, [])

  // デバッグ用: グローバルスコープに関数を公開（開発環境のみ）
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
      // Extend window for debug helpers in development safely
      const w = window as Window & Record<string, any>
      w.clearCart = clearLocalCart
      w.showCart = () => {
        console.log('🛒 現在のカート:', state.items)
        console.log('🗂️ ローカルストレージ:', localStorage.getItem('cart'))
      }
    }
  }, [clearLocalCart, state.items])

  const syncWithDatabase = useCallback(async () => {
    if (sessionUserId) {
      await loadCartFromDatabase()
    }
  }, [sessionUserId, loadCartFromDatabase])

  const addItem = useCallback(async (item: Omit<CartItem, 'quantity'>) => {
    console.log('🛒 addItem呼び出し:', { 
      productId: item.id, 
      productName: item.name,
      isLoggedIn: !!sessionUserId,
      sessionStatus: status,
      currentItemsCount: state.items.length 
    })
    
    if (sessionUserId) {
      // ログイン済み: データベースに保存
      try {
        console.log('📡 APIリクエスト送信中...')
        const response = await runWithRetry(() => fetch('/api/cart', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: item.id, quantity: 1 })
        }), { retries: 2 })

        console.log('📡 APIレスポンス:', { 
          ok: response.ok, 
          status: response.status,
          statusText: response.statusText 
        })

        if (response.ok) {
          console.log('✅ データベース追加成功 - ローカル状態を更新')
          dispatch({ type: 'ADD_ITEM', payload: item })
          // 追加後にデータベースから最新状態を読み込み
          await syncWithDatabase()
        } else {
          console.log('❌ APIレスポンスエラー:', response.status)
          const errorText = await response.text()
          console.log('エラーレスポンステキスト:', errorText)
          
          let error
          try {
            error = JSON.parse(errorText)
          } catch {
            error = { error: `サーバーエラー (${response.status})` }
          }
          alert(error.error || 'カートへの追加に失敗しました')
        }
      } catch (error) {
        console.error('🔥 カート追加エラー:', error)
        alert('カートへの追加に失敗しました')
      }
    } else {
      // 未ログイン: ローカルストレージに保存
      console.log('💾 ローカルストレージに追加')
      dispatch({ type: 'ADD_ITEM', payload: item })
    }
  }, [sessionUserId, status, state.items.length, syncWithDatabase])

  const updateQuantity = useCallback(async (id: string, quantity: number) => {
    if (sessionUserId) {
      // ログイン済み: データベースを更新
      try {
        const cartItem = state.items.find(item => item.id === id)
        if (!cartItem) return

        const response = await runWithRetry(() => fetch(`/api/cart/${cartItem.id}`, {
          method: 'PUT',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantity })
        }), { retries: 2 })

        if (response.ok) {
          dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } })
        }
      } catch (error) {
        console.error('カート更新エラー:', error)
      }
    } else {
      // 未ログイン: ローカル更新
      dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } })
    }
  }, [sessionUserId, state.items])

  const removeItem = useCallback(async (id: string) => {
    if (sessionUserId) {
      // ログイン済み: データベースから削除
      try {
        const cartItem = state.items.find(item => item.id === id)
        if (!cartItem) return

        const response = await runWithRetry(() => fetch(`/api/cart/${cartItem.id}`, {
          method: 'DELETE',
          credentials: 'same-origin'
        }), { retries: 2 })

        if (response.ok) {
          dispatch({ type: 'REMOVE_ITEM', payload: { id } })
        }
      } catch (error) {
        console.error('カート削除エラー:', error)
      }
    } else {
      // 未ログイン: ローカル削除
      dispatch({ type: 'REMOVE_ITEM', payload: { id } })
    }
  }, [sessionUserId, state.items])

  const clearCart = useCallback(async () => {
    if (sessionUserId) {
      // ログイン済み: データベースをクリア
      try {
  const response = await runWithRetry(() => fetch('/api/cart', { method: 'DELETE', credentials: 'same-origin' }), { retries: 2 })
    if (response.ok) {
          dispatch({ type: 'CLEAR_CART' })
        }
      } catch (error) {
        console.error('カートクリアエラー:', error)
      }
    } else {
      // 未ログイン: ローカルクリア
      dispatch({ type: 'CLEAR_CART' })
    }
  }, [sessionUserId])

  const getItemCount = useCallback(() => {
    return state.items.reduce((count, item) => count + item.quantity, 0)
  }, [state.items])

  const getSubtotal = useCallback(() => {
    return state.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  }, [state.items])


  const contextValue: CartContextType = React.useMemo(() => ({
    state,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    getItemCount,
    getSubtotal,
    syncWithDatabase
  }), [state, addItem, updateQuantity, removeItem, clearCart, getItemCount, getSubtotal, syncWithDatabase])

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
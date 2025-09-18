'use client'

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
}

interface ToastContextType {
  toasts: Toast[]
  showToast: (message: string, type?: ToastType, duration?: number) => void
  removeToast: (id: string) => void
}

// グローバルで安全にトーストを表示するための関数（ToastProvider によって登録される）
let globalShowToast: ((message: string, type?: ToastType, duration?: number) => void) | null = null
// Provider マウント前に呼ばれたトーストはここに溜める
const pendingToasts: Array<{ message: string; type: ToastType; duration: number }> = []
export function showGlobalToast(message: string, type: ToastType = 'success', duration = 3000) {
  if (globalShowToast) {
    try {
      globalShowToast(message, type, duration)
    } catch (e) {
      console.warn('showGlobalToast invoke failed', e)
    }
  } else {
    // Provider がまだ登録されていない場合はキューに入れておく
    pendingToasts.push({ message, type, duration })
  }
}

// Provider の登録状態を確認するためのヘルパ
export function isGlobalToastRegistered() {
  return !!globalShowToast
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

interface ToastProviderProps {
  children: ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const showToast = useCallback((message: string, type: ToastType = 'success', duration = 3000) => {
    const id = Date.now().toString()
    const newToast: Toast = { id, message, type, duration }

    setToasts(prev => [...prev, newToast])

    // 自動削除
    setTimeout(() => {
      removeToast(id)
    }, duration)
  }, [removeToast])

  // Provider がマウントされた時にグローバル関数を登録し、アンマウント時に解除する
  useEffect(() => {
    globalShowToast = showToast
    return () => {
      globalShowToast = null
    }
  }, [showToast])
  
  // マウント時にキューに溜まったトーストをフラッシュする
  useEffect(() => {
    if (pendingToasts.length > 0) {
      // flush queued toasts
      pendingToasts.forEach((t) => {
        try {
          showToast(t.message, t.type, t.duration)
        } catch (e) {
          console.warn('Failed to flush pending toast', e)
        }
      })
      pendingToasts.length = 0
    }
  }, [showToast])

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}

interface ToastContainerProps {
  toasts: Toast[]
  onRemove: (id: string) => void
}

function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const toastElement = (
    <div 
      className="fixed top-4 right-4 z-[9999] space-y-2 pointer-events-none"
      style={{
        position: 'fixed',
        top: '16px',
        right: '16px',
        zIndex: 9999,
        pointerEvents: 'none'
      }}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );

  // Portal を使用してbodyに直接レンダリング
  return typeof document !== 'undefined' 
    ? createPortal(toastElement, document.body)
    : toastElement;
}

interface ToastItemProps {
  toast: Toast
  onRemove: (id: string) => void
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const getToastStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'bg-green-500 text-white border-green-600'
      case 'error':
        return 'bg-red-500 text-white border-red-600'
      case 'warning':
        return 'bg-yellow-500 text-white border-yellow-600'
      case 'info':
        return 'bg-blue-500 text-white border-blue-600'
      default:
        return 'bg-gray-500 text-white border-gray-600'
    }
  }

  const getToastIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return '✅'
      case 'error':
        return '❌'
      case 'warning':
        return '⚠️'
      case 'info':
        return 'ℹ️'
      default:
        return '📝'
    }
  }

  return (
    <div
      className={`
        min-w-80 max-w-md px-4 py-3 rounded-lg shadow-lg border-l-4 
        transform transition-all duration-300 ease-in-out pointer-events-auto
        ${getToastStyles(toast.type)}
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{getToastIcon(toast.type)}</span>
          <span className="font-medium">{toast.message}</span>
        </div>
        <button
          onClick={() => onRemove(toast.id)}
          className="ml-3 text-white/80 hover:text-white focus:outline-none focus:text-white transition-colors"
          aria-label="閉じる"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
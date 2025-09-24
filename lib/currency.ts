// Currency conversion utilities
export const CURRENCY_RATES = {
  USD_TO_JPY: 150, // 1 USD = 150 JPY (approximate current rate)
} as const

export function convertToJPY(amount: number, currency: string): number {
  if (!currency) return amount
  if (currency.toLowerCase() === 'usd') {
    // amount is stored in cents for USD; convert to dollars first
    const dollars = amount / 100
    return Math.round(dollars * CURRENCY_RATES.USD_TO_JPY)
  }
  return amount
}

export function formatCurrency(amount: number, currency: string): string {
  if (!currency) {
    return `¥${amount.toLocaleString()}`
  }
  if (currency.toLowerCase() === 'usd') {
    // amount is stored in cents for USD
    return `$${(amount / 100).toFixed(2)}`
  } else if (currency.toLowerCase() === 'jpy') {
    return `¥${amount.toLocaleString()}`
  }
  return `${currency.toUpperCase()} ${amount.toLocaleString()}`
}
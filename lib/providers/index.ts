export const getPaymentProvider = () => {
  const p = (process.env.PAYMENT_PROVIDER || 'square').toLowerCase()
  if (p === 'stripe') {
    // require dynamically to avoid initializing Stripe at module load time
    // (Stripe constructor may throw if API key is not available during build)
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { stripeProvider } = require('./stripe')
      return stripeProvider
    } catch (err) {
      console.error('[providers] failed to load stripe provider:', err)
      throw err
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { squareProvider } = require('./square')
  return squareProvider
}

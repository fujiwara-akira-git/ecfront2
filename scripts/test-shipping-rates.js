/* Simple test runner to call delivery providers directly without starting Next dev server.
   Run in a separate terminal: `node scripts/test-shipping-rates.js`
*/

const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.local') })

// Inline test-mode calculations copied from providers to avoid importing TypeScript modules
const isYamatoTest = process.env.YAMATO_TEST_MODE === 'true'
const isJapanPostTest = process.env.JAPANPOST_TEST_MODE === 'true'

function calculateYamatoTestRate(weightGrams = 1000) {
  const base = 600
  const extra = Math.ceil(Math.max(0, weightGrams - 1000) / 500) * 100
  return base + extra
}

function calculateJapanPostTestRate(weightGrams = 1000) {
  const base = 700
  const extra = Math.ceil(Math.max(0, weightGrams - 1000) / 500) * 120
  return base + extra
}

async function run() {
  const origin = { postalCode: '100-0001', country: 'JP' }
  const destination = { postalCode: '150-0001', country: 'JP' }
  const weightGrams = 1200

  console.log('Env YAMATO_TEST_MODE=', process.env.YAMATO_TEST_MODE)
  console.log('Env JAPANPOST_TEST_MODE=', process.env.JAPANPOST_TEST_MODE)

  if (isYamatoTest) {
    const amount = calculateYamatoTestRate(weightGrams)
    console.log('Yamato (test) rate:', { courierId: 'yamato', serviceCode: 'TA-Q-BIN', amount, currency: 'JPY', eta: '1-2 days' })
  } else {
    console.log('Yamato is in production mode. Skipping actual API call in this test script.')
  }

  if (isJapanPostTest) {
    const amount = calculateJapanPostTestRate(weightGrams)
    console.log('Japan Post (test) rate:', { courierId: 'japanpost', serviceCode: 'YU_PACK', amount, currency: 'JPY', eta: '2-3 days' })
  } else {
    console.log('Japan Post is in production mode. Skipping actual API call in this test script.')
  }
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})

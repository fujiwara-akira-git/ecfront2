const { PrismaClient } = require('@prisma/client');
const { stripeProvider } = require('./lib/providers/stripe');

const prisma = new PrismaClient();

async function testWebhook() {
  try {
    console.log('Testing webhook processing...');

    // Test database connection
    console.log('Testing database connection...');
    await prisma.$queryRaw`SELECT 1`;
    console.log('Database connection OK');

    // Test webhook payload
    const testPayload = {
      id: 'evt_test_manual_4',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_manual_4',
          amount_total: 5000,
          currency: 'jpy',
          customer: 'cus_test_manual_4',
          customer_details: {
            email: 'test4@example.com',
            name: 'Test User 4'
          },
          payment_intent: 'pi_test_manual_4'
        }
      }
    };

    console.log('Processing webhook event...');
    await stripeProvider.handleWebhookEvent(testPayload);

    console.log('Webhook processing completed successfully');

    // Check created records
    const orders = await prisma.order.findMany({ take: 5, orderBy: { createdAt: 'desc' } });
    console.log('Orders after webhook:', orders.length);
    orders.forEach(o => console.log('- Order ID:', o.id, 'Amount:', o.amount, 'Email:', o.customerEmail));

    const payments = await prisma.payment.findMany({ take: 5, orderBy: { createdAt: 'desc' } });
    console.log('Payments after webhook:', payments.length);
    payments.forEach(p => console.log('- Payment ID:', p.id, 'OrderID:', p.orderId, 'Amount:', p.amount));

  } catch (error) {
    console.error('Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testWebhook();
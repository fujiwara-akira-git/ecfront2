const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function updateExistingOrders() {
  try {
    console.log('Starting to update existing orders...')

    // Find the customer2@example.com user
    const targetUser = await prisma.user.findFirst({
      where: {
        email: {
          equals: 'customer2@example.com',
          mode: 'insensitive'
        }
      }
    })

    if (!targetUser) {
      console.log('User customer2@example.com not found')
      return
    }

    console.log(`Found user: ${targetUser.id} - ${targetUser.email}`)

    // Get all orders with null userId
    const ordersToUpdate = await prisma.order.findMany({
      where: {
        userId: null
      }
    })

    console.log(`Found ${ordersToUpdate.length} orders to update`)

    for (const order of ordersToUpdate) {
      try {
        // Update order to link to customer2@example.com user
        await prisma.order.update({
          where: { id: order.id },
          data: {
            userId: targetUser.id,
            customerEmail: targetUser.email
          }
        })
        console.log(`Updated order ${order.id} with userId ${targetUser.id} and email ${targetUser.email}`)
      } catch (err) {
        console.error(`Error updating order ${order.id}:`, err)
      }
    }

    console.log('Finished updating orders')
  } catch (error) {
    console.error('Error in updateExistingOrders:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updateExistingOrders()
import cron from 'node-cron'
import gambling from '../src/strategy/gamblingWithList'
import { sendNotification } from '../src/notification'

// running a task every day at 9:00 AM
cron.schedule('0 9 * * *', () => {
  try {
    console.log('running a task every day at 9:00 AM')
    gambling.buy()
  } catch (error) {
    console.log('buy - error', error.message)
    sendNotification(`[ERROR-BUY]\n ${error.message}`)
  }
})

// running a task every 1 seconds
cron.schedule('*/1 * * * * *', () => {
  try {
    gambling.sell()
  } catch (error) {
    console.log('sell - error', error.message)
    sendNotification(`[ERROR-SELL]\n ${error.message}`)
  }
})

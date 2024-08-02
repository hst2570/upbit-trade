import cron from 'node-cron'
import gambling from '../src/strategy/gamblingWithList'
import { sendNotification } from '../src/notification'

try {
  // running a task every day at 9:00 AM
  cron.schedule('0 9 * * *', () => {
    console.log('running a task every day at 9:00 AM')
    gambling.buy()
  })

  // running a task every 1 seconds
  cron.schedule('*/1 * * * * *', () => {
    gambling.sell()
  })
} catch (error) {
  console.log('error', error)
  sendNotification(`[ERROR]\n ${error.message}`)
}

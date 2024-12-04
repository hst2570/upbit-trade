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

const loggingDebounceTime = 600000
let time = 0

// running a task every 1 seconds
cron.schedule('*/1 * * * * *', () => {
  try {
    gambling.sell()
  } catch (error) {
    if (time <= 0) {
      time = loggingDebounceTime
      console.log('sell - error', error.message)
      sendNotification(`[ERROR-SELL]\n ${error.message}`)
    }
  } finally {
    if (time > 0) {
      time -= 1000
    }
  }
})

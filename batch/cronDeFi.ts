import cron from 'node-cron'
import gambling from '../src/strategy/gamblingWithList'
import { sendNotification } from '../src/notification'
import { run } from '../src/swap/ethUsdc'

// running a task every day at 9:00 AM
cron.schedule('0 9 * * *', () => {
  try {
    run()
  } catch (error) {
    sendNotification(`[ERROR-DEFI]\n ${error?.message}`)
  }
})

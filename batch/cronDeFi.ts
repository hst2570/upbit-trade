import cron from 'node-cron'
import { run } from '../src/swap/ethUsdc'

// running a task every day at 9:00 AM
cron.schedule('0 */6 * * *', () => {
  run()
})

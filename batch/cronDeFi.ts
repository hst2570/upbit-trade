import cron from 'node-cron'
import { run } from '../src/swap/ethUsdc'

/** 10분마다 실행 */
cron.schedule('*/10 * * * *', () => {
  run()
})

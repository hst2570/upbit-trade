import cron from 'node-cron'
import strategy_30_16 from '../src/strategy/30-16'

// running a task every 10 minutes
cron.schedule('*/10 * * * *', () => {
  console.log('running a task every 10 minutes')
  strategy_30_16.sell()
})

// running a task every monday at 9:00 AM
cron.schedule('0 9 * * 1', () => {
  console.log('running a task every monday at 9:00 AM')
  strategy_30_16.buy()
})

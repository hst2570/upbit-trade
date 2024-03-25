import cron from 'node-cron'
import gambling from '../src/strategy/gamblingWithList'

// running a task every day at 9:00 AM
cron.schedule('0 9 * * *', () => {
  console.log('running a task every day at 9:00 AM')
  gambling.buy()
})

// running a task every 10 seconds
cron.schedule('*/1 * * * * *', () => {
  console.log('running a task every 10 seconds')
  gambling.sell()
})

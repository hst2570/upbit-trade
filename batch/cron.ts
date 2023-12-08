import cron from 'node-cron'
import gambling from '../src/strategy/gambling'

// running a task every day at 9:00 AM
cron.schedule('0 9 * * *', () => {
  console.log('running a task every day at 9:00 AM')
  gambling.buy()
})

// running a task every 10 seconds
cron.schedule('*/10 * * * * *', () => {
  console.log('running a task every 10 seconds')
  gambling.sell()
})

// running a task every 10 minutes
// cron.schedule('*/10 * * * *', () => {
//   console.log('running a task every 10 minutes')
//   gambling.sell()
// })

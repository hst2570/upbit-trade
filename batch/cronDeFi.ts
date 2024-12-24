import cron from 'node-cron'
import { run } from '../src/swap/ethUsdc'

// 낮 12시, 16시, 20시에 실행
cron.schedule('0 12,16,20 * * *', () => {
  run()
})

// 저녁 9시부터 11시까지 1시간마다 실행
cron.schedule('0 21-23 * * *', () => {
  run()
})

// 새벽 12시부터 10시까지 1시간마다 실행
cron.schedule('0 0-10 * * *', () => {
  run()
})

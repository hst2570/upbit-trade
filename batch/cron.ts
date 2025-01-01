import cron from 'node-cron'
import { sendNotification } from '../src/notification'
import gambling from '../src/strategy/gamblingWithList'
import { run } from '../src/swap/ethUsdc'

/**
 * 매일 오전 9시에 gambling
 */
cron.schedule('0 9 * * *', () => {
  console.log('running a task every day at 9:00 AM')
  gambling.buy()
})

let isRunning = false
let time = 0
const DEBOUNCE_TIME = 3600000 // 1시간

/**
 * 1초마다 실행, gambling
 */
cron.schedule('*/1 * * * * *', async () => {
  if (isRunning) return // 이전 작업이 실행 중이면 스킵
  isRunning = true

  try {
    await gambling.sell()
  } catch (error) {
    if (time <= 0) {
      sendNotification(`[!판매실패...] ${error?.message}`)
      time = DEBOUNCE_TIME // 1시간 후 다시 시도
    } else {
      time -= 1000 // 1초 감소
    }
  } finally {
    isRunning = false
  }
})

/**
 * 22시에 실행, swap
 */
cron.schedule('0 22 * * *', () => {
  run()
})

/** 1시간마다 실행, health check */
cron.schedule('0 9 * * *', () => {
  try {
    sendNotification('[Health check] 200 ok')
  } catch (error) {}
})

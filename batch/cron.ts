import cron from 'node-cron'
import gambling from '../src/strategy/gamblingWithList'
import { run } from '../src/swap/ethUsdc'
import { Balance } from '../src/types/@api'
import { getMyAccount } from '../src/api'
import { sendNotification } from '../src/notification'

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

/** 10분마다 실행, uniswap */
cron.schedule('*/10 * * * *', () => {
  run()
})

/**
 * 매주 월요일 오전 9시에 내 계좌 잔고를 알려준다.
 */
cron.schedule('0 9 * * 1', () => {
  try {
    const sendMyBalance = async () => {
      const myAccount: Balance[] = await getMyAccount()

      const allBalance = myAccount.reduce((acc, cur) => {
        const { currency, balance, avg_buy_price } = cur

        if (currency === 'KRW') {
          return acc + balance
        } else {
          return acc + balance * avg_buy_price
        }
      }, 0)

      sendNotification('[총 잔고] ' + allBalance.toLocaleString() + '원')
    }

    sendMyBalance()
  } catch (error) {}
})

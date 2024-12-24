import cron from 'node-cron'
import { sendNotification } from '../src/notification'
import { getMyAccount } from '../src/api'
import { Balance } from '../src/types/@api'

// running a task every day at 9:00 AM
cron.schedule('0 9 * * *', () => {
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
})

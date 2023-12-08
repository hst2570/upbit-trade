import { getLastDayCandle, getMyAccount, buy, sell } from '../api'
import { Candle, Balance } from '../types/@api'
import ENV from '../../env'

const MARKET = ENV.MARKET
const CRYPTO_SYMBOL = ENV.CRYPTO_SYMBOL
const HIGH_TRIGGER_RATE = ENV.HIGH_TRIGGER_RATE
const LOW_TRIGGER_RATE = ENV.LOW_TRIGGER_RATE

export default {
  buy: buyCryto,
  sell: sellAll,
}

async function buyCryto() {
  const myAccount: Balance[] = await getMyAccount()
  let myBalance: number = 0

  myAccount.forEach(({ balance, currency }: Balance) => {
    if (currency === 'KRW') {
      const balanceKRW = Number(balance).toFixed(0)
      myBalance = Number(balanceKRW)
    }
  })

  const fee = myBalance * 0.0005

  if (myBalance > 10050) {
    buy(MARKET, myBalance - fee)
  }
}

async function sellAll() {
  const myAccount: Balance[] = await getMyAccount()
  let totalBalance: number = 0
  let avgBuyPrice: number = 0

  myAccount.forEach((balance: Balance) => {
    if (balance.currency === CRYPTO_SYMBOL) {
      totalBalance = balance.balance
      avgBuyPrice = balance.avg_buy_price
    }
  })

  const high =
    Number(((avgBuyPrice * HIGH_TRIGGER_RATE) / 1000).toFixed(0)) * 1000
  const row =
    Number(((avgBuyPrice * LOW_TRIGGER_RATE) / 1000).toFixed(0)) * 1000
  const lowCondition = Number((row * 1.001).toFixed(0))

  if (totalBalance >= 0.0005) {
    const candle: Candle[] = await getLastDayCandle(MARKET, 2)
    const currentCandle = candle[0]
    const currentPrice = currentCandle.trade_price

    if (high <= currentPrice) {
      sell({
        market: MARKET,
        volume: totalBalance,
        orderType: 'market',
      })
    } else if (lowCondition >= currentPrice) {
      sell({
        market: MARKET,
        volume: totalBalance,
        price: row,
        orderType: 'limit',
      })
    }
  }
}

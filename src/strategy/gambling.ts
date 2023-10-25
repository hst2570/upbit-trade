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
  let myAccount: Balance[] = await getMyAccount()
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
  let myAccount: Balance[] = await getMyAccount()
  let totalBalance: number = 0
  let avgBuyPrice: number = 0

  myAccount.forEach((balance: Balance) => {
    if (balance.currency === CRYPTO_SYMBOL) {
      totalBalance = balance.balance
      avgBuyPrice = balance.avg_buy_price
    }
  })

  if (totalBalance >= 0.0005) {
    if (await isSellCondition(avgBuyPrice)) {
      sell(MARKET, totalBalance)
    }
  }
}

const isSellCondition = async (avgBuyPrice: number) => {
  let candle: Candle[] = await getLastDayCandle(MARKET, 2)
  let currentCandle = candle[0]
  let currentPrice = currentCandle.trade_price

  if (
    avgBuyPrice * HIGH_TRIGGER_RATE <= currentPrice ||
    avgBuyPrice * LOW_TRIGGER_RATE >= currentPrice
  ) {
    return true
  } else {
    return false
  }
}

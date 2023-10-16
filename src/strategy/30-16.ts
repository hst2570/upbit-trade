import { getLastDayCandle, getMyAccount, buy, sell } from '../api'
import { Candle, Balance } from '../types/@api'
import { Strategy } from '../types/@strategy'
import ENV from '../../env'

const MARKET = ENV.MARKET
const CRYPTO_SYMBOL = ENV.CRYPTO_SYMBOL
const HIGH_TRIGGER_RATE = 1.3
const LOW_TRIGGER_RATE = 0.84

export default {
  buy: buyCryto,
  sell: sellAll,
}

async function buyCryto() {
  let myAccount: Balance[] = await getMyAccount()
  let myBalance: number = 0

  myAccount.forEach((balance: Balance) => {
    if (balance.currency === 'KRW') {
      myBalance = balance.balance
    }
  })

  if (myBalance > 10000) {
    buy(MARKET, myBalance)
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

  if (await isSellCondition(avgBuyPrice)) {
    sell(MARKET, totalBalance)
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

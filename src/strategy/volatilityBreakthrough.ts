import { getLastDayCandle, getMyAccount, buy, sell } from '../api'
import { Candle, Balance } from '../types/@api'
import { Strategy } from '../types/@strategy'
import ENV from '../../env'

const MARKET = ENV.MARKET
const K = ENV.K
const CRYPTO_SYMBOL = ENV.CRYPTO_SYMBOL

export const volatilityBreakthrough: Strategy = {
  buy: buyCryto,
  sell: sellAll,
}

async function buyCryto() {
  let candle: Candle[] = await getLastDayCandle(MARKET, 2)
  let currentCandle = candle[0]
  let currentPrice = currentCandle.trade_price
  let openingPrice = currentCandle.opening_price

  let lastCandle = candle[1]
  let high = lastCandle.high_price
  let low = lastCandle.low_price

  let myAccount: Balance[] = await getMyAccount()
  let myBalance: number = 0

  myAccount.forEach((balance: Balance) => {
    if (balance.currency === 'KRW') {
      myBalance = balance.balance
    }
  })

  if (openingPrice + (high - low) * K <= currentPrice) {
    if (myBalance > 5000) {
      buy(MARKET, myBalance)
    }
  }
}

async function sellAll() {
  let myAccount: Balance[] = await getMyAccount()
  let myBalance: number = 0

  myAccount.forEach((balance: Balance) => {
    if (balance.currency === CRYPTO_SYMBOL) {
      myBalance = balance.balance
    }
  })

  if (myBalance > 0.0005) {
    sell(MARKET, myBalance)
  }
}

async function sellCryto() {
  let myAccount: Balance[] = await getMyAccount()
  let myBalance: number = 0
  let myAvgBuyPrice: number = 0

  let candle: Candle[] = await getLastDayCandle(MARKET, 2)
  let currentCandle = candle[0]
  let currentPrice = currentCandle.trade_price

  myAccount.forEach((balance: Balance) => {
    if (balance.currency === CRYPTO_SYMBOL) {
      myBalance = balance.balance
      myAvgBuyPrice = balance.avg_buy_price
    }
  })

  if (myBalance > 0.0005) {
    if (myAvgBuyPrice * 1.03 < currentPrice) {
      sell(MARKET, myBalance)
    } else if (myAvgBuyPrice * 0.97 > currentPrice) {
      sell(MARKET, myBalance)
    }
  }
}

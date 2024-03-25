/** 
 * @deprecated 
 * using gamblingWithList.ts instead
 * */
import { getLastDayCandle, getMyAccount, buy, sell } from '../api'
import { Candle, Balance } from '../types/@api'
import ENV from '../../env'

const { MARKET, CRYPTO_SYMBOL, HIGH_TRIGGER_RATE, LOW_TRIGGER_RATE } = ENV

const MINUMUM_BUY_AMOUNT = 10050
const MINUMUM_SELL_AMOUNT = 0.0005
const MIMUMUM_TRANSACTION_UNIT = 1000
const TRADING_FEE = 0.0005

async function buyCryto() {
  const myAccount: Balance[] = await getMyAccount()

  const { balance } =
    myAccount.find(({ currency }: Balance) => currency === 'KRW') || {}
  const myBalance = Number(Number(balance).toFixed(0))
  const fee = myBalance * TRADING_FEE

  if (myBalance > MINUMUM_BUY_AMOUNT) {
    buy(MARKET, myBalance - fee)
  }
}

async function sellAll() {
  const myAccount: Balance[] = await getMyAccount()
  const { balance: totalBalance, avg_buy_price: avgBuyPrice } =
    myAccount.find(({ currency }: Balance) => currency === CRYPTO_SYMBOL) || {}

  if (!avgBuyPrice || !totalBalance) {
    return
  }

  const high = generatePrice(avgBuyPrice, HIGH_TRIGGER_RATE)
  const row = generatePrice(avgBuyPrice, LOW_TRIGGER_RATE)

  if (totalBalance >= MINUMUM_SELL_AMOUNT) {
    const candle: Candle[] = await getLastDayCandle({
      market: MARKET,
      count: 2,
    })
    const [currentCandle] = candle
    const { trade_price: currentPrice } = currentCandle

    if (high <= currentPrice) {
      sell({
        market: MARKET,
        volume: totalBalance,
        price: high,
        orderType: 'limit',
      })
    } else if (row >= currentPrice) {
      sell({
        market: MARKET,
        volume: totalBalance,
        price: row,
        orderType: 'limit',
      })
    }
  }
}

const generatePrice = (price: number, rate: number) => {
  return (
    Number(((price * rate) / MIMUMUM_TRANSACTION_UNIT).toFixed(0)) *
    MIMUMUM_TRANSACTION_UNIT
  )
}

export default {
  buy: buyCryto,
  sell: sellAll,
}

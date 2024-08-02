import { getLastDayCandle, getMyAccount, buy, sell } from '../api'
import { Candle, Balance } from '../types/@api'
import ENV from '../../env'

const { INVESTMENT_LIST } = ENV
const MINUMUM_BUY_AMOUNT = 10050
const TRADING_FEE = 0.0005
const CHANGE_RATE = 0.0138

async function buyCryto() {
  const myAccount: Balance[] = await getMyAccount()
  const { balance } =
    myAccount.find(({ currency }: Balance) => currency === 'KRW') || {}
  const disabledRatioList: number[] = []
  const disabledList = myAccount.map(
    ({ currency, balance: currencyBalance }: Balance) => {
      const { MARKET: disableMarket, INVESTMENT_RATIO: disableRatio } =
        INVESTMENT_LIST.find(
          ({ CRYPTO_SYMBOL }) => CRYPTO_SYMBOL === currency
        ) || {}

      if (disableMarket && currencyBalance > 0 && disableRatio) {
        disabledRatioList.push(disableRatio)
        return disableMarket
      }
    }
  )

  INVESTMENT_LIST.forEach(async investment => {
    const { MARKET, INVESTMENT_RATIO } = investment

    if (disabledList.includes(MARKET)) {
      return
    }

    const disableRatio = Number(
      (1 - disabledRatioList.reduce((acc, cur) => acc + cur, 0)).toFixed(1)
    )
    const myBalance = Number(Number(balance).toFixed(0))
    const ratio = Number((INVESTMENT_RATIO / disableRatio).toFixed(2))
    const buyAmount = myBalance * ratio
    const fee = buyAmount * TRADING_FEE

    if (buyAmount > MINUMUM_BUY_AMOUNT) {
      const candleList: Candle[] = await getLastDayCandle({
        market: MARKET,
        count: 2,
      })

      const lastDayCandle =
        candleList.find(item => {
          const { candle_date_time_kst } = item
          const candleDate = new Date(candle_date_time_kst)?.getDate()
          const lastDateTime = new Date()?.getTime() - 24 * 60 * 60 * 1000
          const lastDate = new Date(lastDateTime)?.getDate()

          return candleDate === lastDate
        }) || ({} as Candle)

      const { change_rate: lastDayChangeRate } = lastDayCandle

      if (lastDayChangeRate && lastDayChangeRate <= CHANGE_RATE) {
        return
      }

      buy(MARKET, buyAmount - fee)
    }
  })
}

async function sellAll() {
  const myAccount: Balance[] = await getMyAccount()

  INVESTMENT_LIST.forEach(async investment => {
    const {
      MARKET,
      HIGH_TRIGGER_RATE,
      LOW_TRIGGER_RATE,
      CRYPTO_SYMBOL,
      MINUMUM_SELL_AMOUNT,
      MIMUMUM_TRANSACTION_UNIT,
    } = investment

    const { balance: totalBalance, avg_buy_price: avgBuyPrice } =
      myAccount.find(({ currency }: Balance) => currency === CRYPTO_SYMBOL) ||
      {}

    if (!avgBuyPrice || !totalBalance) {
      return
    }

    const high = generatePrice(
      avgBuyPrice,
      HIGH_TRIGGER_RATE,
      MIMUMUM_TRANSACTION_UNIT
    )

    const row = generatePrice(
      avgBuyPrice,
      LOW_TRIGGER_RATE,
      MIMUMUM_TRANSACTION_UNIT
    )

    if (totalBalance >= MINUMUM_SELL_AMOUNT) {
      const [currentCandle, lastDayCandle]: Candle[] = await getLastDayCandle({
        market: MARKET,
        count: 2,
      })
      const { change_rate: lastDayChangeRate } = lastDayCandle
      const { trade_price: currentPrice } = currentCandle

      if (lastDayChangeRate && lastDayChangeRate <= CHANGE_RATE) {
        return
      }

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
  })
}

const generatePrice = (
  price: number,
  rate: number,
  minimumTransactionUnit: number = 1000
) => {
  return (
    Number(((price * rate) / minimumTransactionUnit).toFixed(0)) *
    minimumTransactionUnit
  )
}

export default {
  buy: buyCryto,
  sell: sellAll,
}

// const data = require('./data/up/KRW-BORA-day.json') /** 보라 데이터 */
// const data = require('./data/up/KRW-SOL-day.json') /** 솔라나 데이터 */
// import data from './data/up/KRW-BTC-day.json' /** 비트코인 데이터 */
const data = require('./data/up/KRW-ETH-day.json') /** 이더리움 데이터 */

const allCandles = [...data].map((candle, i) => {
  return { ...candle, month: new Date(candle.candle_date_time_utc).getMonth() }
})

const candles = [...allCandles].filter(({ candle_date_time_utc: date }) => {
  return date > '2023-01-01'
})
const calculate = () => {
  let acc = 0

  for (let index = 0; index < candles.length; index++) {
    const { high_price, low_price, opening_price } = candles[index]
    /** opening_price 기준 하루 등락폭 계산 */
    const high = high_price / opening_price - 1
    const low = 1 - low_price / opening_price
    acc += high + low
  }
  console.log('acc: ', (acc / candles.length) * 100)
}
calculate()

/** RSI 계산 스크립트, 수익률이 좋은 경우를 찾기힘듦 */
// const data = require('./data/up/KRW-SOL-day.json')
const data = require('./data/up/KRW-BTC-day.json')
// const data = require('./data/up/KRW-BTC-min.json')
// const data = require('./data/up/KRW-BORA-day.json')
// const data = require('./data/up/KRW-ETH-day.json')
const candles = [...data]

function calculateRSI(prices, period = 14) {
  const changes = []
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1])
  }

  const gain = []
  const loss = []

  for (let i = 0; i < changes.length; i++) {
    if (changes[i] >= 0) {
      gain.push(changes[i])
      loss.push(0)
    } else {
      gain.push(0)
      loss.push(-changes[i])
    }
  }

  const RSIs = []
  for (let i = 0; i < prices.length; i++) {
    if (i < period) {
      RSIs.push(null) // RSI not available for first `period` data points
    } else {
      let avgGain = 0
      let avgLoss = 0

      for (let j = i - period; j < i; j++) {
        avgGain += gain[j]
        avgLoss += loss[j]
      }

      avgGain /= period
      avgLoss /= period

      const RS = avgGain / avgLoss
      const RSI = 100 - 100 / (1 + RS)
      RSIs.push(RSI.toFixed(1))
    }
  }

  return RSIs
}

const results = []
const prices = candles.map(candle => candle.trade_price)
const max = {
  amount: 0,
}

for (let shortIndex = 1; shortIndex < 14; shortIndex++) {
  let amount = 1_000_000
  let balance = 0

  console.log(shortIndex)

  for (let mediumIndex = 1; mediumIndex < 30; mediumIndex++) {
    if (shortIndex >= mediumIndex) continue

    for (let longIndex = 1; longIndex < 60; longIndex++) {
      if (mediumIndex >= longIndex) continue

      const rsi1 = calculateRSI(prices, shortIndex)
      const rsi2 = calculateRSI(prices, mediumIndex)
      const rsi3 = calculateRSI(prices, longIndex)

      prices.forEach((price, i) => {
        const short = rsi1[i]
        const medium = rsi2[i]
        const long = rsi3[i]

        const buyCondition = short < 10 && medium < 20 && long < 30
        const sellCondition = short > 90 && medium > 80 && long > 70

        if (amount < 0) {
          return
        }

        if (buyCondition && amount > 0) {
          balance = (amount / price).toFixed(4)
          amount = 0
        }
        if (sellCondition && balance > 0) {
          amount = balance * price
          balance = 0
        }
      })

      if (balance > 0) {
        amount = balance * prices[prices.length - 1]
        balance = 0
      }

      if (amount > max.amount) {
        max.amount = amount
        max.shortIndex = shortIndex
        max.mediumIndex = mediumIndex
        max.longIndex = longIndex
      }

      results.push({
        shortIndex,
        mediumIndex,
        longIndex,
        amount,
      })

      amount = 1000000
      balance = 0
    }
  }
}

console.log(results.sort((a, b) => b.amount > a.amount).slice(0, 15))

console.log(max)

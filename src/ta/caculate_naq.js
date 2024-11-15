const data = require('./data/NASDAQ/1D_inverster.json')
// .filter(({ candle_date_time_utc: date }) => {
//   return date > '2020-01-01'
// })

const candles = data.data
/*
curl --request GET \
     --url 'https://api.upbit.com/v1/candles/days?market=KRW-BTC&to=2023-12-11T00%3A00%3A00%2B09%3A00&count=200' \
     --header 'accept: application/json' > 2023_12_11_up.json
 */

function addCommas(number) {
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

const movingAverage = (candles, cc = 17) => {
  const MA = [].fill(0, 0, candles.length)

  for (let i = 0; i < candles.length - cc; i++) {
    let sum = candles.slice(i, i + cc).reduce((acc, ca) => {
      const trade_price = ca[1]
      acc + trade_price
    }, 0)

    MA[i + cc] = sum / cc
  }

  return MA
}

const RSI = (candles, cc = 120) => {
  const U = []
  const D = []
  const R = [].fill(0, 0, candles.length)

  for (let i = 0; i < candles.length; i++) {
    const [, open, high, low, close] = candles[i]
    const prevClose = open

    if (i === 0) {
      U.push(0)
      D.push(0)
      continue
    }

    const changed = close - prevClose

    if (changed > 0) {
      U.push(close - prevClose)
      D.push(0)
    } else {
      U.push(0)
      D.push(prevClose - close)
    }
  }

  for (let i = 0; i < U.length - cc; i++) {
    let sumU = U.slice(i, i + cc).reduce((acc, cur) => acc + cur, 0) / cc
    let sumD = D.slice(i, i + cc).reduce((acc, cur) => acc + cur, 0) / cc

    R[i + cc] = (sumU / (sumU + sumD)) * 100
  }

  return R
}

const mvag = movingAverage(candles)
const rsis = RSI(candles)

const winInfo = {
  winRate: 1,
  loseRate: 1,
  probability: 0,
  winCount: 0,
  loseCount: 0,
  balance: 0,
  ratio: 0,
}

const initBalance = 1_000_000
const MAX = 3

let winList = []
let balance = initBalance
let maxBalance = 0

// calculateWinProbability(2.096, 0.996)

for (let i = 1.01; i < MAX; i = i + 0.01) {
  for (let j = 0.999; j > 0; j = j - 0.001) {
    // for (let w = 0; w < 90; w = w + 1) {
    /* */
    try {
      calculateWinProbability(i, j)
    } catch (e) {
      console.log(e)
    }
    // }
    /*/
    for (
      let investmentRatio = 0.1;
      investmentRatio <= 1;
      investmentRatio = investmentRatio + 0.1
    ) {
      // for (let leverage = 1; leverage <= 25; leverage = leverage + 1) {
      try {
        calculateWinProbability(i, j, investmentRatio)
      } catch {}
      // }
    }
    /* */
  }
  console.clear()
  console.info(`${((i * 100 - 100) / (MAX - 1)).toFixed(1)}%`)
}

const sortedList = winList
  .reduce((acc, item) => {
    const winRateFixed = item.winRate.toFixed(1)
    const loseRateFixed = item.loseRate.toFixed(1)

    let findItem = acc?.find(
      accItem =>
        accItem.winRateFixed === winRateFixed &&
        accItem.loseRateFixed === loseRateFixed
    )

    let findIndex = acc?.findIndex(
      accItem =>
        accItem.winRateFixed === winRateFixed &&
        accItem.loseRateFixed === loseRateFixed
    )

    let moreBalance = findItem?.balance < item.balance

    if (findItem && moreBalance) {
      acc[findIndex] = {
        ...item,
        winRateFixed,
        loseRateFixed,
      }
    } else if (findIndex < 0) {
      acc.push({
        ...item,
        winRateFixed,
        loseRateFixed,
      })
    }

    return acc
  }, [])
  .sort((a, b) => b.balance - a.balance)
  .slice(0, 10)
  .reverse()
console.clear()
sortedList.forEach(item => {
  console.log(
    `--- \nwinRate: ${item.winRate.toFixed(
      3
    )} / loseRate: ${item.loseRate.toFixed(
      3
    )} / prob: ${item.probability.toFixed(2)} wc: ${item.winCount} / lc: ${
      item.loseCount
    } / bal: ${item.balance.toFixed(0)}`

    // / ratio: ${item.ratio.toFixed(
    //   2
    // )} / leverage: ${item.leverage}`
  )
})

winInfo.balance = addCommas(winInfo.balance.toFixed(0))

console.log('winInfo: ', winInfo)
console.log('candle: ', candles.length)

function calculateWinProbability(
  winRate,
  loseRate = 1,
  weightValue = 1,
  investmentRatio = 1,
  leverage = 1
) {
  let win = 0
  let lose = 0
  let currentPrice = 0
  let lastPrice = 0
  let lowCount = 0
  let weight = 0
  let before = ''

  candles.forEach(originCandle => {
    // 0: time, 1:open 2:high 3:low 4:close 5:volume
    const [, open, high, low, close] = originCandle

    if (lowCount > 0) {
      lowCount--
      return
    }

    if (currentPrice === 0) {
      currentPrice = open
      balance = balance * (1 - 0.0005)
    }

    lastPrice = close

    const winTargetPrice = currentPrice * winRate
    const loseTargetPrice = currentPrice * loseRate

    if (low <= loseTargetPrice) {
      lose++

      balance =
        (1 - investmentRatio) * balance +
        balance * investmentRatio -
        balance * investmentRatio * leverage * (1 - loseRate.toFixed(4))
      balance = balance * 0.999
      currentPrice = 0

      if (before === 'lose') {
        weight = weight + weightValue
        lowCount += lowCount + weight
      }
      before = 'lose'
    } else if (high >= winTargetPrice) {
      win++
      balance =
        (1 - investmentRatio) * balance +
        balance * investmentRatio +
        balance * investmentRatio * leverage * (winRate.toFixed(4) - 1)

      balance = balance * 0.999
      currentPrice = 0
      before = 'win'
      weight = 0
    }

    if (balance < 0) {
      throw new Error()
    }
  })

  if (currentPrice !== 0) {
    balance = (lastPrice / currentPrice) * balance
  }

  let winProbability = (win / (win + lose)) * 100

  if (maxBalance < balance && winRate > 1 && loseRate < 1) {
    maxBalance = balance
    winInfo.probability = winProbability
    winInfo.winRate = winRate
    winInfo.loseRate = loseRate
    winInfo.winCount = win
    winInfo.loseCount = lose
    winInfo.balance = balance
    winInfo.ratio = investmentRatio
    winInfo.leverage = leverage
  }

  winList.push({
    winRate: winRate,
    loseRate: loseRate,
    probability: winProbability,
    winCount: win,
    loseCount: lose,
    balance: balance,
    ratio: investmentRatio,
    leverage: leverage,
  })

  balance = initBalance
  lowCount = 0
  weight = 0
  before = ''
}

const data1 = require('./data/up/weeks.json')

const candles = data1.sort((a, b) => {
  return a.candle_date_time_utc > b.candle_date_time_utc
})
// .filter(({ candle_date_time_utc: date }) => {
//   return date > '2022-01-01'
// })

/*
curl --request GET \
     --url 'https://api.upbit.com/v1/candles/days?market=KRW-BTC&to=2023-12-11T00%3A00%3A00%2B09%3A00&count=200' \
     --header 'accept: application/json' > 2023_12_11_up.json
 */

function addCommas(number) {
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

const winInfo = {
  winRate: 1,
  loseRate: 1,
  probability: 0,
  winCount: 0,
  loseCount: 0,
  balance: 0,
  ratio: 0,
}
let winList = []
const initBalance = 1
let balance = initBalance

let maxBalance = 0
console.log('candles, ', candles.length)

// calculateWinProbability(2.096, 0.996)

const MAX = 3
for (let i = 1.001; i < MAX; i = i + 0.001) {
  for (let j = 0.999; j > 0; j = j - 0.001) {
    /* */
    try {
      calculateWinProbability(i, j)
    } catch {}
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

function calculateWinProbability(
  winRate,
  loseRate = 1,
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
    const {
      opening_price: open,
      trade_price: close,
      high_price: high,
      low_price: low,
    } = originCandle

    if (lowCount > 0) {
      lowCount--
      return
    }

    if (currentPrice === 0) {
      currentPrice = open
    }

    lastPrice = close

    let winTargetPrice = currentPrice * winRate
    let loseTargetPrice = currentPrice * loseRate

    if (low <= loseTargetPrice) {
      lose++

      balance =
        (1 - investmentRatio) * balance +
        balance * investmentRatio -
        balance * investmentRatio * leverage * (1 - loseRate.toFixed(4))
      balance = balance * 0.9995
      currentPrice = 0

      if (before === 'lose') {
        weight = weight + 1
        lowCount += lowCount + weight
      }
      before = 'lose'
    } else if (high >= winTargetPrice) {
      win++
      balance =
        (1 - investmentRatio) * balance +
        balance * investmentRatio +
        balance * investmentRatio * leverage * (winRate.toFixed(4) - 1)

      balance = balance * 0.9995
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

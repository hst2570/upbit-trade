const data1 = require('./data/up/2017_12_02_up.json')
const data2 = require('./data/up/2018_06_20_up.json')
const data3 = require('./data/up/2019_01_06_up.json')
const data4 = require('./data/up/2019_07_25_up.json')
const data5 = require('./data/up/2020_02_10_up.json')
const data6 = require('./data/up/2020_08_28_up.json')
const data7 = require('./data/up/2021_03_16_up.json')
const data8 = require('./data/up/2021_10_02_up.json')
const data9 = require('./data/up/2022_04_20_up.json')
const data10 = require('./data/up/2022_11_06_up.json')
const data11 = require('./data/up/2023_05_25_up.json')
const data12 = require('./data/up/2023_12_11_up.json')
const data = require('./data/up/KRW-SOL-day.json')
// const data = require('./data/up/KRW-ETH-day.json')
// const candles = [...data]
const candles = [
  ...data1.reverse(),
  ...data2.reverse(),
  ...data3.reverse(),
  ...data4.reverse(),
  ...data5.reverse(),
  ...data6.reverse(),
  ...data7.reverse(),
  ...data8.reverse(),
  ...data9.reverse(),
  ...data10.reverse(),
  ...data11.reverse(),
  ...data12.reverse(),
]
// .filter(({ candle_date_time_utc: date }) => {
//   return date > '2020-01-01'
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

const initBalance = 10000000
const MAX = 3

let winList = []
let balance = initBalance
let maxBalance = 0

// calculateWinProbability(1.96, 0.984)

for (let i = 1.01; i < MAX; i = i + 0.01) {
  for (let j = 0.999; j > 0; j = j - 0.001) {
    // for (let w = 0; w < 3; w = w + 0.1) {
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
  // .slice(0, 10)
  .reverse()
// console.clear()
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
  let lowBalance = 100000000000

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

    const winTargetPrice = currentPrice * winRate
    const loseTargetPrice = currentPrice * loseRate

    if (low <= loseTargetPrice) {
      lose++

      balance =
        (1 - investmentRatio) * balance +
        balance * investmentRatio -
        balance * investmentRatio * leverage * (1 - loseRate.toFixed(4))
      balance = balance * 0.9995
      currentPrice = 0

      if (before === 'lose') {
        weight = weight + weightValue
        lowCount = weight
      }
      before = 'lose'
    } else if (high >= winTargetPrice) {
      win++
      balance =
        (1 - investmentRatio) * balance +
        balance * investmentRatio +
        balance * investmentRatio * leverage * (winRate.toFixed(4) - 1)
      // console.log('balance win: ', balance)
      balance = balance * 0.9995
      currentPrice = 0
      before = 'win'
      weight = 0
    }

    if (lowBalance > balance) {
      lowBalance = balance
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
    winInfo.lowBalance = lowBalance
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

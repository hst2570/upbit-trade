const data1 = require('./data/2017_10_26.json')
const data2 = require('./data/2018_10_26.json')
const data3 = require('./data/2019_10_26.json')
const data4 = require('./data/2020_10_26.json')
const data5 = require('./data/2021_10_26.json')
const data6 = require('./data/2022_10_26.json')
const data7 = require('./data/2023_10_26.json')

const candles = [
  ...data1.data.quotes,
  ...data2.data.quotes,
  ...data3.data.quotes,
  ...data4.data.quotes,
  ...data5.data.quotes,
  ...data6.data.quotes,
  ...data7.data.quotes,
]

/*
2017-10-26 00:00:00 = 1508943600
2018-10-26 00:00:00 = 1540489200
2019-10-26 00:00:00 = 1572025200
2020-10-26 00:00:00 = 1603561200
2021-10-26 00:00:00 = 1635097200
2022-10-26 00:00:00 = 1666633200
2023-10-26 00:00:00 = 1698169200

https://api.coinmarketcap.com/data-api/v3.1/cryptocurrency/historical?id=1&timeStart=1508943600&timeEnd=1540489200&interval=1d&convertId=2781
https://api.coinmarketcap.com/data-api/v3.1/cryptocurrency/historical?id=1&timeStart=1540489200&timeEnd=1572025200&interval=1d&convertId=2781
https://api.coinmarketcap.com/data-api/v3.1/cryptocurrency/historical?id=1&timeStart=1572025200&timeEnd=1603561200&interval=1d&convertId=2781
https://api.coinmarketcap.com/data-api/v3.1/cryptocurrency/historical?id=1&timeStart=1603561200&timeEnd=1635097200&interval=1d&convertId=2781
https://api.coinmarketcap.com/data-api/v3.1/cryptocurrency/historical?id=1&timeStart=1635097200&timeEnd=1666633200&interval=1d&convertId=2781
https://api.coinmarketcap.com/data-api/v3.1/cryptocurrency/historical?id=1&timeStart=1666633200&timeEnd=1698169200&interval=1d&convertId=2781

curl https://api.coinmarketcap.com/data-api/v3.1/cryptocurrency/historical\?id\=1\&timeStart\=1698169200\&interval\=1d\&convertId\=2781 > 2023_10_26.json
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
const initBalance = 10_000
let balance = initBalance

let maxBalance = 0
console.log('candles, ', candles.length)

// calculateWinProbability(1.131, 0.992)

for (let i = 1.001; i < 2; i = i + 0.001) {
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
      for (let leverage = 1; leverage <= 25; leverage = leverage + 1) {
        try {
          calculateWinProbability(i, j, investmentRatio, leverage)
        } catch {}
      }
    }
    /* */
  }
  console.clear()
  console.info(`${(i * 100 - 100).toFixed(1)}%`)
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

  if (winRate - loseRate > 0.5) {
    // return
  }

  candles.forEach(originCandle => {
    const candle = originCandle.quote
    let open = candle.open
    let close = candle.close
    let high = candle.high
    let row = candle.low

    if (currentPrice === 0) {
      currentPrice = open
    }

    let winTargetPrice = currentPrice * winRate
    let loseTargetPrice = currentPrice * loseRate

    /* */
    if (row <= loseTargetPrice) {
      lose++

      balance =
        (1 - investmentRatio) * balance +
        balance * investmentRatio -
        balance * investmentRatio * leverage * (1 - loseRate.toFixed(4))
      balance = balance * 0.9995
      currentPrice = 0
    } else if (high >= winTargetPrice) {
      win++
      balance =
        (1 - investmentRatio) * balance +
        balance * investmentRatio +
        balance * investmentRatio * leverage * (winRate.toFixed(4) - 1)

      balance = balance * 0.9995
      currentPrice = 0
    }

    /*/
    if (high >= winTargetPrice) {
      win++
      balance =
        (1 - investmentRatio) * balance +
        balance * investmentRatio +
        balance * investmentRatio * leverage * (winRate.toFixed(4) - 1)

      balance = balance * 0.9995
      currentPrice = 0
    } else if (row <= loseTargetPrice) {
      lose++
      balance =
        (1 - investmentRatio) * balance +
        balance * investmentRatio -
        balance * investmentRatio * leverage * (1 - loseRate.toFixed(4))
      balance = balance * 0.9995
      currentPrice = 0
    }

    /* */

    if (balance < 0) {
      throw new Error()
    }
  })

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
}

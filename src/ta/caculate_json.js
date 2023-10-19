const fs = require('fs')
const csv = require('csv-parser')
const candles = require('./1y.json')

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
const initBalance = 10_000_000
let balance = initBalance

let maxBalance = 0
console.log('candles, ', candles.length)
// for (let i = 1.01; i < 2; i = i + 0.01) {
//   for (let j = 1; j > 0; j = j - 0.01) {
//     // try {
//     //   calculateWinProbability(i, j)
//     // } catch {}
//     for (
//       let investmentRatio = 0.1;
//       investmentRatio <= 1;
//       investmentRatio = investmentRatio + 0.1
//     ) {
//       // for (let leverage = 1; leverage <= 25; leverage = leverage + 1) {
//       try {
//         calculateWinProbability(i, j, investmentRatio)
//       } catch {}
//       // }
//     }
//   }
// }
calculateWinProbability(1.31, 0.83)
const sortedList = winList.sort((a, b) => a.balance - b.balance).reverse()

sortedList.slice(0, 100).forEach(item => {
  console.log(
    `winRate: ${item.winRate.toFixed(2)} / loseRate: ${item.loseRate.toFixed(
      2
    )} / prob: ${item.probability.toFixed(2)} wc: ${item.winCount} / lc: ${
      item.loseCount
    } / bal: ${item.balance.toFixed(2)}
                / ratio: ${item.ratio.toFixed(2)} / leverage: ${item.leverage}`
  )
})

console.log('winInfo: ', winInfo)

function calculateWinProbability(
  winRate,
  loseRate,
  investmentRatio = 1,
  leverage = 1
) {
  let win = 0
  let lose = 0
  let currentPrice = 0

  if (winRate - loseRate > 0.5) {
    return
  }

  candles.forEach((originCandle, index) => {
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

    if (
      open <= loseTargetPrice ||
      close <= loseTargetPrice ||
      row <= loseTargetPrice
    ) {
      lose++

      balance =
        (1 - investmentRatio) * balance +
        balance * investmentRatio -
        balance * investmentRatio * leverage * (1 - loseRate.toFixed(4))
      balance = balance * 0.9995
      currentPrice = 0
    } else if (
      open >= winTargetPrice ||
      close >= winTargetPrice ||
      high >= winTargetPrice
    ) {
      win++
      balance =
        (1 - investmentRatio) * balance +
        balance * investmentRatio +
        balance * investmentRatio * leverage * (winRate.toFixed(4) - 1)

      // balance = balance * winRate
      balance = balance * 0.9995
      currentPrice = 0
    }

    // if (
    //   open >= winTargetPrice ||
    //   close >= winTargetPrice ||
    //   high >= winTargetPrice
    // ) {
    //   win++
    //   balance =
    //     (1 - investmentRatio) * balance +
    //     balance * investmentRatio +
    //     balance * investmentRatio * leverage * (winRate.toFixed(4) - 1)

    //   currentPrice = 0
    // } else if (
    //   open <= loseTargetPrice ||
    //   close <= loseTargetPrice ||
    //   row <= loseTargetPrice
    // ) {
    //   lose++
    //   balance =
    //     (1 - investmentRatio) * balance +
    //     balance * investmentRatio -
    //     balance * investmentRatio * leverage * (1 - loseRate.toFixed(4))
    //   currentPrice = 0
    // }

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

  // if (
  //     winProbability > winInfo.probability &&
  //     winProbability < 80 &&
  //     winRate > 1 &&
  //     loseRate < 1 &&
  //     (win > 100 || lose > 100)
  // ) {
  //     winInfo.probability = winProbability;
  //     winInfo.winRate = winRate;
  //     winInfo.loseRate = loseRate;
  //     winInfo.winCount = win;
  //     winInfo.loseCount = lose;
  //     winInfo.balance = balance;
  // }

  balance = initBalance
}

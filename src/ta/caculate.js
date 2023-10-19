const fs = require('fs')
const csv = require('csv-parser')

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
let candles = []

let maxBalance = 0

;(async () => {
  const csv = readCSVFile(
    // '/Users/eden/Documents/BTC_graph_coinmarketcap2.csv'
    // '/Users/eden/Documents/BTC_coinmarketcap.csv'
    '/Users/eden/Documents/BTC_All_graph_coinmarketcap_10_16.csv'
    // '/Users/eden/Documents/BTC_1Y_graph_coinmarketcap_10_16.csv'
    // '/Users/eden/Documents/BTC_ALL_graph_coinmarketcap.csv'
    // '/Users/eden/Documents/ETH_1498834800-1688396399_graph_coinmarketcap.csv'
    // '/Users/eden/Documents/BTC_1Y_graph_coinmarketcap.csv'
    // '/Users/eden/Documents/BTC_1633014000-1686581999_graph_coinmarketcap.csv'
    // '/Users/eden/Documents/BTC_1633014000-1686581999_graph_coinmarketcap2.csv'
  )

  csv.on('end', () => {
    console.log('candles, ', candles.length)
    for (let i = 1.01; i < 2; i = i + 0.01) {
      for (let j = 1; j > 0; j = j - 0.01) {
        try {
          calculateWinProbability(i, j)
        } catch {}
        // for (
        //     let investmentRatio = 0.1;
        //     investmentRatio <= 1;
        //     investmentRatio = investmentRatio + 0.1
        // ) {
        //     for (
        //         let leverage = 1;
        //         leverage <= 25;
        //         leverage = leverage + 1
        //     ) {
        //         try {
        //             calculateWinProbability(
        //                 i,
        //                 j,
        //                 investmentRatio,
        //                 leverage
        //             );
        //         } catch {}
        //     }
        // }
      }
      console.log('i: ', i)
    }

    const sortedList = winList.sort((a, b) => a.balance - b.balance).reverse()

    sortedList.slice(0, 100).forEach(item => {
      console.log(
        `winRate: ${item.winRate.toFixed(
          2
        )} / loseRate: ${item.loseRate.toFixed(
          2
        )} / prob: ${item.probability.toFixed(2)} wc: ${item.winCount} / lc: ${
          item.loseCount
        } / bal: ${item.balance.toFixed(2)}
                / ratio: ${item.ratio.toFixed(2)}`
      )
    })

    console.log('winInfo: ', winInfo)
  })
})()

function calculateKellyCriterion(winProbability, winProfitRate, lossLossRate) {
  // 계산을 위한 변수 초기화
  var p = winProbability // 이길 확률
  var q = 1 - winProbability // 질 확률
  var r = winProfitRate // 이길 때의 수익률
  var s = lossLossRate // 질 때의 손해율

  // 켈리 공식 계산
  var kellyFraction = p / s - q / r

  // 결과 반환
  return kellyFraction
}

function readCSVFile(filePath) {
  return fs
    .createReadStream(filePath)
    .pipe(csv())
    .on('data', row => {
      // Process each row of data here
      candles.push([row.timestamp, row.open, row.high, row.low, row.close])
    })
}

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

  candles.forEach((candle, index) => {
    let open = candle[1]
    let close = candle[4]
    let high = candle[2]
    let row = candle[3]

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
      balance = balance * loseRate * 0.9995
      // balance =
      //     (1 - investmentRatio) * balance +
      //     balance * investmentRatio -
      //     balance *
      //         investmentRatio *
      //         leverage *
      //         (1 - loseRate.toFixed(4));
      currentPrice = 0
    } else if (
      open >= winTargetPrice ||
      close >= winTargetPrice ||
      high >= winTargetPrice
    ) {
      win++
      // balance =
      //     (1 - investmentRatio) * balance +
      //     balance * investmentRatio +
      //     balance * investmentRatio * leverage * (winRate.toFixed(4) - 1);

      balance = balance * winRate * 0.9995
      currentPrice = 0
    }

    // if (
    //     open >= winTargetPrice ||
    //     close >= winTargetPrice ||
    //     high >= winTargetPrice
    // ) {
    //     win++;
    //     // balance =
    //     //     (1 - investmentRatio) * balance +
    //     //     balance * investmentRatio +
    //     //     balance * investmentRatio * leverage * (winRate.toFixed(4) - 1);

    //     balance = balance * winRate;
    //     currentPrice = 0;
    // } else if (
    //     open <= loseTargetPrice ||
    //     close <= loseTargetPrice ||
    //     row <= loseTargetPrice
    // ) {
    //     lose++;
    //     balance = balance * loseRate;
    //     // balance =
    //     //     (1 - investmentRatio) * balance +
    //     //     balance * investmentRatio -
    //     //     balance *
    //     //         investmentRatio *
    //     //         leverage *
    //     //         (1 - loseRate.toFixed(4));
    //     currentPrice = 0;
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

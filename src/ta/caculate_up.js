// const data = require('./data/up/KRW-BORA-day.json') /** 보라 데이터 */
// const data = require('./data/up/KRW-SOL-day.json') /** 솔라나 데이터 */
import data from './data/up/KRW-BTC-day.json' /** 비트코인 데이터 */
// const data = require('./data/up/KRW-ETH-day.json') /** 이더리움 데이터 */

const allCandles = [...data].map((candle, i) => {
  return { ...candle, month: new Date(candle.candle_date_time_utc).getMonth() }
})

const candles = [...allCandles].filter(({ candle_date_time_utc: date }) => {
  return date > '2011-10-01'
})
/** 특정 날짜로 필터링 하고 싶을때 아래 주석 코드 해제 
 
*/

const addCommas = number =>
  number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')

/** 가장 많은 수익을 얻은 데이터 저장용 변수 */
const winInfo = {
  winRate: 1,
  loseRate: 1,
  probability: 0,
  winCount: 0,
  loseCount: 0,
  balance: 0,
  ratio: 0,
}

/** 모든 경우의 수를 저장하는 변수 */
let winList = []
/** 최대값 저장용 임시 변수 */
let maxBalance = 0

const calculateWinProbability = ({
  winRate /** 승리 시 이득 */,
  loseRate = 1 /** 패배 시 손해 */,
  weightValue = 1 /** 패배 시 lowCount 증가율 */,
  investmentRatio = 1 /** 투자 비율 */,
  leverage = 1 /** 레버리지 */,
  mvag,
  maxWeight = 15,
  rsis,
}) => {
  /** 승리 카운터용 변수 */
  let win = 0
  /** 패배 카운터용 변슈 */
  let lose = 0
  /** 포지션 가격 */
  let currentPrice = 0
  /** 마지막 가격 */
  let lastPrice = candles[candles.length - 1].opening_price
  /** 패배 시 거래 스킵용 방어 변수 */
  let lowCount = 0
  /** 가중치 */
  let weight = 0
  /** 이전 상태, 승리 또는 배패 */
  let before = ''
  /** 수익률 저장을 위한 임시 변수 */
  let balance = initBalance
  /** 최저 잔고 확인용 */
  let lowBalance = 100000000000000

  for (let index = 0; index < candles.length; index++) {
    const {
      opening_price: open,
      high_price: high,
      low_price: low,
    } = candles[index]

    /** 패배가 연속으로 이어질 시 lowCount가 늘어나며 lowCount가 0이 될때까지 거래하지 않는다. */
    if (lowCount > 0 && currentPrice === 0) {
      lowCount--
      continue
    }

    /** 오픈 가격에 샀음 */
    if (currentPrice === 0) {
      currentPrice = open
      balance = balance * 0.9995
    }

    if (currentPrice === 0) {
      continue
    }

    const winTargetPrice =
      currentPrice * winRate /** 이 가격이되면 승리, 이득 */

    const loseTargetPrice =
      currentPrice * loseRate /** 이 가격이되면 패배 손해 */

    if (low <= loseTargetPrice) {
      lose++
      balance =
        (1 - investmentRatio) * balance +
        balance * investmentRatio -
        balance * investmentRatio * leverage * (1 - loseRate.toFixed(4))
      // balance = balance * (close / currentPrice)
      balance = balance * 0.9995
      currentPrice = 0

      if (before === 'lose') {
        weight = weight + weightValue
        lowCount = weight
      }

      before = 'lose' /** 이전 상태 계산용 변수 */
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

    if (lowBalance > balance) {
      lowBalance = balance
    }

    if (balance < 0) {
      balance = initBalance
      return
    }
  }

  if (currentPrice !== 0) {
    balance = (lastPrice / currentPrice) * balance
  }

  let winProbability = (win / (win + lose)) * 100

  if (maxBalance < balance && winRate > 1 && loseRate < 1) {
    maxBalance = balance
    winInfo.probability = winProbability /** 승리확률 */
    winInfo.winRate = winRate /** 이득 비율 */
    winInfo.loseRate = loseRate /** 손해 비율 */
    winInfo.winCount = win /** 승리 횟수 */
    winInfo.loseCount = lose /** 패배 횟수 */
    winInfo.balance = balance /** 최종 밸런스 */
    winInfo.ratio = investmentRatio /** 투자 비율 */
    winInfo.leverage = leverage /** 레버리지 */
    winInfo.lowBalance = lowBalance /** 최저 밸런스 */
    // winInfo.winWeight = winWeight
    /**
     *  아래 세 변수를 추가한 이유:
     *  백테스트 후 포지션 입장 시 입장 가격과 lowCount를 설정용
     *  .cahce 폴더 하위 알맞는 포지션 파일에 해당 데이터 저장
     */
    winInfo.weight = weight /** 마지막 포지션의 lowCount 가중치 */
    winInfo.lowCount = lowCount /** 마지막 포지션의 lowCount */
    winInfo.currentPrice = currentPrice /** 마지막 포지션의 가격 */
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
    weightValue,
    maxWeight,
  })

  balance = initBalance
  lowCount = 0
  weight = 0
  before = ''
  winList = winList.sort((a, b) => b.balance - a.balance).slice(0, 100)
}

/** 초기 시작 금액 */
const initBalance = 1_000_000
/** 최대 수익률 */
const MAX = 3
const winGrowthRate = 0.01
const loseGrowthRate = 0.001

calculateWinProbability({
  winRate: 2.06,
  loseRate: 0.982,
})

// for (
//   let winRate = 1 + winGrowthRate;
//   winRate < MAX;
//   winRate = winRate + winGrowthRate
// ) {
//   for (
//     let loseRate = 1 - loseGrowthRate;
//     loseRate > 0.5;
//     loseRate = loseRate - loseGrowthRate
//   ) {
//     try {
//       calculateWinProbability({
//         winRate,
//         loseRate,
//       })
//     } catch (e) {
//       // console.log(e)
//     }
//   }
//   console.clear()
//   console.info(`${((winRate * 100 - 100) / (MAX - 1)).toFixed(1)}%`)
// }

const avg =
  winList
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 100)
    .reduce((acc, { balance }) => acc + balance, 0) / 100

const sortedList = winList
  .sort((a, b) => b.balance - a.balance)
  // .filter(({ wc }) => wc > 10)
  .slice(0, 20)
  .reverse()

/** 데이터 출력 부분 */
sortedList.forEach(item => {
  console.log(
    `--- \nwinRate: ${item.winRate.toFixed(
      3
    )} / loseRate: ${item.loseRate.toFixed(
      3
    )} / prob: ${item.probability.toFixed(2)} wc: ${item.winCount} / lc: ${
      item.loseCount
    } / bal: ${addCommas(item.balance.toFixed(0))} / 
    weightValue: ${item.weightValue} / maxWeight: ${item.maxWeight}`

    // / ratio: ${item.ratio.toFixed(
    //   2
    // )} / leverage: ${item.leverage}`
  )
})

console.log(addCommas(avg.toFixed(0)))
/** 최대값 출력 부분 */
// winInfo.balance = addCommas(winInfo.balance.toFixed(0))
console.log('winInfo: ', winInfo)

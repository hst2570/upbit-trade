// const data = require('./data/up/KRW-BORA-day.json') /** 보라 데이터 */
// const data = require('./data/up/KRW-SOL-day.json') /** 솔라나 데이터 */
const data = require('./data/up/KRW-BTC-day.json') /** 비트코인 데이터 */
// const data = require('./data/up/KRW-BTC-min.json') /** 비트코인 데이터 */
// const data = require('./data/up/KRW-ETH-day.json') /** 이더리움 데이터 */

const candles = [...data]
/** 특정 날짜로 필터링 하고 싶을때 아래 주석 코드 해제 */
// .filter(({ candle_date_time_utc: date }) => {
//   return date > '2024-07-01'
// })

const addCommas = number =>
  Number(number)
    .toFixed(0)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',')

/** 가장 많은 수익을 얻은 데이터 저장용 변수 */
const winInfo = {
  winRate: 1,
  loseRate: 1,
  probability: 0,
  winCount: 0,
  loseCount: 0,
  balance: 0,
  ratio: 0,
  lowBalance: 0,
}

/** 초기 시작 금액 */
const initBalance = 100
/** 최대 수익률 */
const MAX = 3
/** 수수료 */
const FEE = 0.9995

/** 모든 경우의 수를 저장하는 변수 */
let winList = []

/** 최대값 저장용 임시 변수 */
let maxBalance = 0

// calculateWinProbability({
//   winRate: 1.1,
//   loseRate: 0.96,
//   leverage: 20,
//   investmentRatio: 0.3,
// }) /** 특정 값을 넣어서 계산 가능 */

for (let winRate = 1.01; winRate < MAX; winRate = winRate + 0.01) {
  for (let loseRate = 0.99; loseRate > 0; loseRate = loseRate - 0.001) {
    // for (let leverage = 1; leverage <= 30; leverage = leverage + 1) {
    //   if ((1 - loseRate) * leverage >= 1) {
    //     continue
    //   }
    //   for (
    //     let investmentRatio = 0.1;
    //     investmentRatio <= 1;
    //     investmentRatio = investmentRatio + 0.1
    //   ) {
    try {
      calculateWinProbability({
        winRate,
        loseRate,
        // leverage,
        // investmentRatio,
      })
    } catch (e) {
      // console.log(e)
    }
    //   }
    // }
  }
  console.clear()
  console.info(`${((winRate * 100 - 100) / (MAX - 1)).toFixed(1)}%`)
}

const sortedList = winList
  .sort((a, b) => b.balance - a.balance)
  .slice(0, 110)
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
    } / bal: ${addCommas(item.balance)}`
  )
})

/** 최대값 출력 부분 */
winInfo.balance = addCommas(winInfo.balance)
console.log('winInfo: ', winInfo)
console.log(
  'avg',
  addCommas(winList.reduce((acc, cur) => acc + cur.balance, 0) / winList.length)
)

function calculateWinProbability({
  /** 승리 시 이득 */
  winRate,
  /** 패배 시 손해 */
  loseRate = 1,
  /** 투자 비율 */
  investmentRatio = 1,
  /** 레버리지 */
  leverage = 1,
}) {
  /** 승리 카운터용 변수 */
  let win = 0
  /** 패배 카운터용 변슈 */
  let lose = 0
  /** 포지션 가격 */
  let currentPrice = 0
  /** 수익률 저장을 위한 임시 변수 */
  let balance = initBalance
  /** 최저 잔고 확인용 */
  let lowBalance = 100000000000000
  /** 마지막 가격 */
  let lastPrice = candles[candles.length - 1].trade_price

  let beforeChange = 0

  candles.forEach(originCandle => {
    const {
      opening_price: open,
      trade_price: close,
      high_price: high,
      low_price: low,
      change_rate,
    } = originCandle

    /** 전날 상승률이 +1.38% 이하인 경우만 매수 */
    if (beforeChange <= 0.0138) {
      beforeChange = change_rate
      return
    } else {
      beforeChange = change_rate
    }

    /** 오픈 가격에 샀음 */
    if (currentPrice === 0) {
      currentPrice = open
      balance = balance * FEE
    }

    /** 이 가격이되면 승리, 이득 */
    const winTargetPrice = currentPrice * winRate

    /** 이 가격이되면 패배 손해 */
    const loseTargetPrice = currentPrice * loseRate

    if (low <= loseTargetPrice) {
      lose++
      balance =
        ((1 - investmentRatio) * balance +
          balance * investmentRatio -
          balance * investmentRatio * leverage * (1 - loseRate.toFixed(4))) *
        FEE
      currentPrice = 0
    } else if (high >= winTargetPrice) {
      win++
      balance =
        ((1 - investmentRatio) * balance +
          balance * investmentRatio +
          balance * investmentRatio * leverage * (winRate.toFixed(4) - 1)) *
        FEE
      currentPrice = 0
    }

    if (lowBalance > balance) {
      lowBalance = balance
    }

    if (balance < 0) {
      throw new Error('balance is negative')
    }
  })

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
    /**
     *  아래 세 변수를 추가한 이유
     *  백테스트 후 포지션 입장 시 입장 가격과 lowCount를 설정용
     *  .cahce 폴더 하위 알맞는 포지션 파일에 해당 데이터 저장
     */
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
  })

  balance = initBalance
  lowCount = 0
  weight = 0
  before = ''
}

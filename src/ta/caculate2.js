//  binance 비트코인 30일 데이터를 가져온 후 엘리어트 파동 분석을 사용해 상승, 하락을 확인한다. use ta.js, cctx

const ccxt = require('ccxt');
const fs = require('fs');
const csv = require('csv-parser');

const binance = new ccxt.binance();
const symbol = 'BTC/USDT';
const timeframe = '1d';
const since = Date.now() - 1000 * 60 * 60 * 24 * 500;
const winRate = 1.3;
const loseRate = 0.85;
const candles = [];
const winInfo = {
    winRate: 1,
    loseRate: 1,
    probability: 0,
    winCount: 0,
    loseCount: 0,
    balance: 0
};
let balance = 10000;
let maxBalance = 0;

(async () => {
    // const candles = await binance.fetchOHLCV(symbol, timeframe, since);
    /* timestamp, open, high, row, close, volume */
    let win = 0;
    let lose = 0;
    let currentPrice = 0;

    const csv = readCSVFile(
        // '/Users/eden/Documents/BTC_graph_coinmarketcap2.csv'
        // '/Users/eden/Documents/BTC_coinmarketcap.csv'
        // '/Users/eden/Documents/BTC_ALL_graph_coinmarketcap.csv'
        '/Users/eden/Documents/BTC_1Y_graph_coinmarketcap_10_16.csv'
        // '/Users/eden/Documents/BTC_1Y_graph_coinmarketcap.csv'
        // '/Users/eden/Documents/BTC_1633014000-1686581999_graph_coinmarketcap.csv'
    );

    csv.on('end', () => {
        candles.forEach((candle, index) => {
            let open = candle[1];
            let close = candle[4];
            let high = candle[2];
            let row = candle[3];

            if (currentPrice === 0) {
                currentPrice = open;
            }

            let winTargetPrice = currentPrice * winRate;
            let loseTargetPrice = currentPrice * loseRate;

            if (
                open <= loseTargetPrice ||
                close <= loseTargetPrice ||
                row <= loseTargetPrice
            ) {
                lose++;
                currentPrice = 0;
            } else if (
                open >= winTargetPrice ||
                close >= winTargetPrice ||
                high >= winTargetPrice
            ) {
                win++;
                currentPrice = 0;
            }
        });

        console.log('win: ', win, winRate);
        console.log('lose: ', lose, loseRate);
        console.log('승률: ', (win / (win + lose)) * 100);
    });
})();

function readCSVFile(filePath) {
    return fs
        .createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
            // Process each row of data here
            candles.push([
                row.timestamp,
                row.open,
                row.high,
                row.low,
                row.close
            ]);
        });
}

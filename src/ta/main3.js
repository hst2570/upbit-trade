//  binance 비트코인 30일 데이터를 가져온 후 엘리어트 파동 분석을 사용해 상승, 하락을 확인한다. use ta.js, cctx

const ccxt = require('ccxt');
const ElliottWave = require('./strategy/ew_gpt.js').ElliottWave;

const binance = new ccxt.binance();
const symbol = 'BTC/USDT';
const timeframe = '1h';
const since = Date.now() - 1000 * 60 * 60 * 24 * 3;

(async () => {
    const candles = await binance.fetchOHLCV(symbol, timeframe, since);
    const closes = candles.map((candle) => candle[4]);
    const waves = new ElliottWave(closes).find_elliott_wave();

    console.log('The current price is:', closes[closes.length - 1]);
    console.log('The waves is:', waves, waves.length);
})();

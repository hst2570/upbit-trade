//  binance 비트코인 30일 데이터를 가져온 후 엘리어트 파동 분석을 사용해 상승, 하락을 확인한다. use cctx

const ccxt = require('ccxt');

const binance = new ccxt.binance();
const symbol = 'BTC/USDT';
const timeframe = '1h';
const since = Date.now() - 1000 * 60 * 60 * 24 * 3;

(async () => {
    const candles = await binance.fetchOHLCV(symbol, timeframe, since);
    const closes = candles.map((candle) => candle[4]);

    const trendChanges = getTrendChanges(closes);
    const waves = elliottWave(trendChanges);

    console.log('The waves is:', waves);
    console.log('The current price is:', closes[closes.length - 1]);
})();

function getTrendChanges(priceData) {
    if (!Array.isArray(priceData) || priceData.length === 0) {
        throw new Error('Price data must be a non-empty array.');
    }

    return priceData
        .slice(1)
        .reduce((trendChanges, currentValue, currentIndex) => {
            const previousValue = priceData[currentIndex];
            const currentTrend =
                previousValue < currentValue ? 'rising' : 'falling';

            const previousChange = trendChanges[trendChanges.length - 1];
            if (
                previousChange &&
                previousChange.currentTrend !== currentTrend
            ) {
                trendChanges.push({
                    index: currentIndex,
                    price: currentValue,
                    previousTrend: previousChange.currentTrend,
                    currentTrend: currentTrend
                });
            } else if (!previousChange && currentTrend === 'falling') {
                trendChanges.push({
                    index: currentIndex,
                    price: currentValue,
                    previousTrend: 'rising',
                    currentTrend: 'falling'
                });
            }

            return trendChanges;
        }, []);
}

function elliottWave(trendChanges) {
    if (!Array.isArray(trendChanges) || trendChanges.length < 9) {
        throw new Error(
            'Trend changes must be an array with at least 9 elements.'
        );
    }

    const waves = [];

    for (let i = 0; i < trendChanges.length - 8; i++) {
        const t = trendChanges.slice(i, i + 9);

        const isBullish =
            t[0].currentTrend === 'rising' &&
            t[2].currentTrend === 'rising' &&
            t[4].currentTrend === 'rising' &&
            t[6].currentTrend === 'rising';
        const isBearish =
            t[0].currentTrend === 'falling' &&
            t[2].currentTrend === 'falling' &&
            t[4].currentTrend === 'falling' &&
            t[6].currentTrend === 'falling';

        if (isBullish || isBearish) {
            waves.push({
                start: t[0].index,
                end: t[8].index,
                startPrice: t[0].price,
                endPrice: t[8].price,
                type:
                    isBullish && t[8].price > t[0].price ? 'Bullish' : 'Bearish'
            });
        }
    }

    return waves;
}

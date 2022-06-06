import { getLastCandle, getMyAccount, buy, sell } from './api';
import { Candle, Balance } from "./types/@api";

let MARKET = "KRW-BTC";
let CRYPTO_SYMBOL = "BTC";
let K = 0.5;

async function buyCryto() {
    let candle: Candle[] = await getLastCandle(60, MARKET, 2);
    let currentCandle = candle[0];
    let currentPrice = currentCandle.trade_price;

    let lastCandle = candle[1];
    let lastPrice = lastCandle.trade_price;
    let high = lastCandle.high_price;
    let low = lastCandle.low_price;
    
    let myAccount: Balance[] = await getMyAccount();
    let myBalance: number = 0;

    myAccount.forEach((balance: any) => {
        let currency = balance.currency;
        if (currency === 'KRW') {
            myBalance = balance.balance;
        }
    });

    if (lastPrice + (high - low) * K <= currentPrice) {
        if (myBalance > 5000) {
            buy(MARKET, myBalance);
        }
    }
}

async function sellCryto() {
    let myAccount: Balance[] = await getMyAccount();
    let myBalance: number = 0;
    let myAvgBuyPrice: number = 0;

    let candle: Candle[] = await getLastCandle(60, MARKET, 2);
    let currentCandle = candle[0];
    let currentPrice = currentCandle.trade_price;

    myAccount.forEach((balance: any) => {
        let currency = balance.currency;
        if (currency === CRYPTO_SYMBOL) {
            myBalance = balance.balance;
            myAvgBuyPrice = balance.avg_buy_price;
        }
    });

    if (myBalance > 0.0005) {
        if (myAvgBuyPrice * 1.03 < currentPrice) {
            sell(MARKET, myBalance);
        } else if(myAvgBuyPrice * 0.97 > currentPrice) {
            sell(MARKET, myBalance);
        }
    }
}

async function sellAll() {
    let myAccount: Balance[] = await getMyAccount();
    let myBalance: number = 0;

    myAccount.forEach((balance: any) => {
        let currency = balance.currency;
        if (currency === CRYPTO_SYMBOL) {
            myBalance = balance.balance;
        }
    });

    if (myBalance > 0.0005) {
        sell(MARKET, myBalance);
    }
}

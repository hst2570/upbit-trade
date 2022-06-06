export type Candle = {
    trade_price: number;
    high_price: number;
    low_price: number
}

export type Balance = {
    currency: string;
    balance: number;
    avg_buy_price: number;
}
export type Candle = {
  opening_price: number
  trade_price: number
  high_price: number
  low_price: number
  change_price?: number
  change_rate?: number
}

export type Balance = {
  currency: string
  balance: number
  avg_buy_price: number
}

import { AxiosResponse } from 'axios'
import { encode } from 'querystring'
import {
  requestAuthWtihParams,
  requestAuthWtihBody,
  requestAuth,
  request,
} from './api'
import { sendNotification } from '../notification'

export const getLastCandle = (unit: number, market: string, count: number) => {
  const query: any = {}

  if (market) {
    query['market'] = market
  }

  if (count) {
    query['count'] = count
  }

  return request(
    `https://api.upbit.com/v1/candles/minutes/${unit}?${encode(query)}`,
    'GET'
  )
    .then((res: AxiosResponse) => {
      return res.data
    })
    .catch(e => {
      console.log(`[ERROR] - getLastCandle: e.message`)
    })
}

export const getLastDayCandle = ({
  market,
  count,
}: {
  market: string
  count: number
}) => {
  const query: any = {}

  if (market) {
    query['market'] = market
  }

  if (count) {
    query['count'] = count
  }

  return request(
    `https://api.upbit.com/v1/candles/days?${encode(query)}`,
    'GET'
  )
    .then((res: AxiosResponse) => {
      return res.data
    })
    .catch(e => {
      console.log(`[ERROR] - getLastDayCandle: ${e.message}`)
    })
}

export const getMyAccount = () => {
  const url = `https://api.upbit.com/v1/accounts`

  return requestAuth(url, 'GET')
    .then((res: AxiosResponse) => {
      let data = res.data
      return data
    })
    .catch(e => {
      console.log(`[ERROR - getMyAccount] ${e.message}`)
    })
}

export const buy = (market: string, price: number) => {
  const url = `https://api.upbit.com/v1/orders`
  const priceKRW = Number(price).toFixed(0)

  return requestAuthWtihBody(url, 'POST', {
    market: market,
    side: 'bid',
    price: priceKRW,
    ord_type: 'price',
  })
    .then((res: AxiosResponse) => {
      sendNotification(`[BUY]\n${market}\nKRW: ${priceKRW}`)
      let data = res.data
      return data
    })
    .catch(e => {
      const {
        response: {
          data: { error },
        },
      } = e
      console.log(error)
      sendNotification(`[BUY-ERROR]\n${market}\nKRW: ${priceKRW}, ${error}`)
    })
}

export const sell = ({
  market,
  volume,
  price,
  orderType,
}: {
  market: string
  volume: number
  price?: number
  orderType: string
}) => {
  const url = `https://api.upbit.com/v1/orders`

  return requestAuthWtihParams(url, 'POST', {
    market,
    volume,
    price,
    side: 'ask',
    ord_type: orderType,
  })
    .then((res: AxiosResponse) => {
      sendNotification(`[SELL]\n ${market}\nvolume: ${volume}\n${orderType}`)
      let data = res.data
      return data
    })
    .catch(e => {
      const {
        response: {
          data: { error },
        },
      } = e
      console.log(error)
      sendNotification(`[SELL-ERROR]\n ${market}\nvolume: ${volume}, ${error}`)
    })
}

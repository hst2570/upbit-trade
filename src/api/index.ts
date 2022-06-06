import { AxiosResponse } from "axios";
import { encode } from "querystring";
import { requestAuthWtihParams, requestAuth, request } from "./api";

export const getLastCandle = (unit: number, market: string, count: number) => {
  let query: any = {};

  if (market) {
    query['market'] = market;
  }

  if (count) {
    query['count'] = count;
  }

  return request(
      `https://api.upbit.com/v1/candles/minutes/${unit}?${encode(query)}`,
      'GET'
    )
    .then((res: AxiosResponse) => {
      return res.data;
    })
    .catch((e) => {
      console.log(e);
    });
}

export const getMyAccount = () => {
  let url = `https://api.upbit.com/v1/accounts`;

  return requestAuth(url,'GET')
    .then((res: AxiosResponse) => {
      let data = res.data;
      return data;
    })
    .catch((e) => {
      console.log(e);
    });
}

export const buy = (market: string, price: number) => {
  let url = `https://api.upbit.com/v1/orders`;
  return requestAuthWtihParams(
    url, 
    "POST", 
    {
      market: market,
      side: "bid",
      price: price,
      ord_type: "price",
    })
    .then((res: AxiosResponse) => {
      let data = res.data;
      return data;
    })
    .catch((e) => {
      console.log(e);
    })
}

export const sell = (market: string, volume: number) => {
  let url = `https://api.upbit.com/v1/orders`;
  return requestAuthWtihParams(
    url, 
    "POST", 
    {
      market: market,
      side: "ask",
      volume: volume,
      ord_type: "market",
    })
    .then((res: AxiosResponse) => {
      let data = res.data;
      return data;
    })
    .catch((e) => {
      console.log(e);
    })
}

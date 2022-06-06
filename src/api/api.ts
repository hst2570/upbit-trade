import axios from "axios";
import { getAuthTokenWithParams, getAuthToken } from "./token";

export const requestAuthWtihParams = async (url: string, method: string, params: {}) => {
  const { authorizationToken, query } = getAuthTokenWithParams(params);
    const res = await axios({
      method,
      url: `${url}?${query}`,
      headers: { Authorization: authorizationToken },
    });
    return res;
}

export const requestAuthWtihBody = async (url: string, method: string, params: {}) => {
  const { authorizationToken, query } = getAuthTokenWithParams(params);
  const body = params;
    const res = await axios({
      method,
      url: `${url}?${query}`,
      headers: { Authorization: authorizationToken },
      data: body
    });
    return res;
}

export const request = async (url: string, method: string ) => {
  const res = await axios({
    method,
    url,
  });
  return res;
}

export const requestAuth = async (url: string, method: string ) => {
  const authorizationToken = getAuthToken();
  const res = await axios({
    method,
    url,
    headers: { Authorization: authorizationToken },
  });
  return res;
}

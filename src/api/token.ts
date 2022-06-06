import crypto from "crypto";
import jwt from "jsonwebtoken";
import querystring from "querystring";
import { v4 as uuidv4 } from "uuid";
import ENV from "../../env";

let ACCESS_KEY = ENV.ACCESS_KEY;
let SECRET_KEY = ENV.SECRET_KEY;

export const getAuthTokenWithParams = (params: {}) => {
  const query = querystring.encode(params);
  const hash = crypto.createHash("sha512");
  const queryHash = hash.update(query, "utf-8").digest("hex");

  const payload = {
    access_key: ACCESS_KEY,
    nonce: uuidv4(),
    query_hash: queryHash,
    query_hash_alg: "SHA512",
  };

  const jwtToken = jwt.sign(payload, SECRET_KEY);
  return { authorizationToken: `Bearer ${jwtToken}`, query };
}

export const getAuthToken = () => {
  const payload = {
    access_key: ACCESS_KEY,
    nonce: uuidv4(),
  };

  const jwtToken = jwt.sign(payload, SECRET_KEY);
  return `Bearer ${jwtToken}`;
}

import { request } from "../api/api";
import ENV from "../../env";

var CHAT_TOKEN = ENV.TELEGRAM_CHAT_TOKEN;
var BOT_TOKEN = ENV.TELEGRAM_BOT_TOKEN;

export const sendTelegram = (message: string) => {
    let url = `https://api.telegram.org/bot${BOT_TOKEN}/sendmessage?chat_id=${CHAT_TOKEN}&text=${message}`;

    request(url, 'GET')
};

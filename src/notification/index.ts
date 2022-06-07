import { request } from "../api/api";
import ENV from "../../env";

var TELEGRAM_CHAT_TOKEN = ENV.TELEGRAM_CHAT_TOKEN;
var TELEGRAM_BOT_TOKEN = ENV.TELEGRAM_BOT_TOKEN;

const sendTelegram = (message: string) => {
    if (!TELEGRAM_CHAT_TOKEN || !TELEGRAM_BOT_TOKEN) {
        return;
    }

    request(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendmessage?chat_id=${TELEGRAM_CHAT_TOKEN}&text=${message}`,
        'GET'
        );
};

export const sendNotification = (message: string) => {
    sendTelegram(message);
}
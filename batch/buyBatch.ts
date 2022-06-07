import { volatilityBreakthrough } from "../src/strategy/volatilityBreakthrough";

let timeout = 0;

let interval = setInterval(() => {
    if (timeout > 58000) {
        clearInterval(interval);
        return;
    }
    timeout = timeout + 2000;
    console.log(timeout);
    volatilityBreakthrough.buy();
}, 2000)

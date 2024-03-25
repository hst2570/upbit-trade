/*
curl --request GET \
     --url 'https://api.upbit.com/v1/candles/days?market=KRW-BTC&to=2023-12-11T00%3A00%3A00%2B09%3A00&count=200' \
     --header 'accept: application/json' > 2023_12_11_up.json


const options = {method: 'GET', headers: {accept: 'application/json'}};

fetch('https://api.upbit.com/v1/candles/minutes/1?market=KRW-BTC&count=1', options)
  .then(response => response.json())
  .then(response => console.log(response))
  .catch(err => console.error(err));
 */
import fs from 'fs'
const now = new Date()
/* format: yyyy-MM-dd'T'HH:mm:ss
 */
const time = `${now.getFullYear()}-${now.getMonth() + 1}-${
  now.getDate() - 1
}T${now.getHours()}:00:00`

const startDate = '2017-09-26'
const market = 'KRW-BTC'
// const startDate = '2021-10-15'
// const market = 'KRW-SOL'
// const startDate = '2020-08-05'
// const market = 'KRW-BORA'

// const baseUrl =
//   'https://api.upbit.com/v1/candles/minutes/60?market=KRW-BTC&count=200'
// const baseUrl = `https://api.upbit.com/v1/candles/minutes/60?market=${market}&count=200`
const baseUrl = `https://api.upbit.com/v1/candles/days?market=${market}&count=200`
const list = []

const getData = async time => {
  const params = []
  if (time) {
    params.push(`to=${time}`)
  }

  try {
    const response = await fetch(`${baseUrl}&${params.join('&')}`)
    const data = await response.json()
    // console.log(data)

    list.push(...data)
  } catch (e) {
    console.log(e)
  }
}

const getLastDate = () => {
  const lastDate = list[list.length - 1].candle_date_time_utc
  return lastDate
}

;(async () => {
  await getData()

  let lastDate = getLastDate()
  const start = new Date(startDate)

  while (new Date(lastDate) > start) {
    await getData(lastDate)
    lastDate = getLastDate()
    await new Promise(resolve => setTimeout(resolve, 100))

    console.log(start)
    console.log(new Date(lastDate))
  }

  const sortedList = list.sort((a, b) => {
    return a.candle_date_time_utc > b.candle_date_time_utc
  })

  fs.writeFileSync(`${market}-day.json`, JSON.stringify(sortedList), 'utf8')
})()

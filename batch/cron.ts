import cron from 'node-cron'
import gambling from '../src/strategy/gambling'

/*
strategy	data  date	init	result	probability	win/low
14/2	1d	2022.10(1y)	10,000,000	21,091,919	27%	10/27
31/17	1d	2022.10(1y)	10,000,000	14,222,275	66%	2/1
init/6up	1d	2022.10(1y)	10,000,000	16,541,700	-	-
31/17	1M	2017.06.01	10,000,000	61,677,912	50%	22/22
14/2	1M	2017.06.01	10,000,000	5,976,210	9.2%	7/69
*/

// running a task every 10 minutes
cron.schedule('*/10 * * * *', () => {
  console.log('running a task every 10 minutes')
  gambling.sell()
})

// running a task every day at 9:00 AM
cron.schedule('0 9 * * *', () => {
  console.log('running a task every day at 9:00 AM')
  gambling.buy()
})

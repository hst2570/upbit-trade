import gambling from '../../src/strategy/gamblingWithList'

const run = async () => {
  console.log('running a task every day at 9:00 AM')
  await gambling.buy()
}

run()

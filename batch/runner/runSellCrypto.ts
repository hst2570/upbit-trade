import gambling from '../../src/strategy/gamblingWithList'

const run = () => async () => {
  await gambling.sell()
}

run()

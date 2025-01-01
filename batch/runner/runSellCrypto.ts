import gambling from '../../src/strategy/gamblingWithList'

const run = () => async () => {
  let timeout = null as any
  let interval = null as any
  let isRunning = false

  interval = setInterval(async () => {
    if (isRunning) return

    isRunning = true
    await gambling.sell()
    isRunning = false
  }, 1000)

  timeout = setTimeout(() => {
    clearInterval(interval)
    clearTimeout(timeout)
  }, 60000)
}

run()

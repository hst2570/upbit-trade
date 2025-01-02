import gambling from '../../src/strategy/gamblingWithList'

const ONE_MINUTE = 60000

const timer = fn => {
  let timeout = null as any

  return new Promise<boolean>(resolve => {
    timeout = setTimeout(() => {
      fn && fn()
      clearTimeout(timeout)
      resolve(true)
    }, ONE_MINUTE - 1000)
  })
}

const run = async () => {
  let interval = null as any
  let isRunning = false

  interval = setInterval(() => {
    if (isRunning) return

    const sell = async () => {
      isRunning = true
      try {
        await gambling.sell()
      } catch (error) {
        console.log(`[!판매실패...] ${error?.message}`)
      } finally {
        isRunning = false
      }
    }
    sell()
  }, 1000)

  await timer(() => clearInterval(interval))
}

run()

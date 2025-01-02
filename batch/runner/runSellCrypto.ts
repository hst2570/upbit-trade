import gambling from '../../src/strategy/gamblingWithList'

const timer = fn => {
  let timeout = null as any

  return new Promise<boolean>(resolve => {
    timeout = setTimeout(() => {
      fn && fn()
      clearTimeout(timeout)
      resolve(true)
    }, 600000)
  })
}

const run = () => {
  console.log('running a task every day at 9:00 AM')
  let timeout = null as any
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

  timer(() => clearInterval(interval)).then(() => {
    clearInterval(interval)
    clearTimeout(timeout)
  })
}

run()

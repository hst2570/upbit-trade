import { sendNotification } from '../../src/notification'

const run = () => async () => {
  sendNotification('[Health check] 200 ok')
}

run()

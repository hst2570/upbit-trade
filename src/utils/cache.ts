import fs from 'fs'

const cachePath = `${__dirname}/../../.cache`

export type CacheState = {
  beforeTradeState: 'win' | 'lose'
  weight: number
  loseCount: number
}

export const saveCache = (context: CacheState, key: string = '') => {
  try {
    fs.mkdirSync(cachePath, { recursive: true })
    fs.writeFileSync(
      `${cachePath}/state${key}`,
      JSON.stringify(context),
      'utf8'
    )
  } catch (e) {
    console.log(e)
    return {}
  }
}

export const loadCache = (key: string = '') => {
  try {
    const data = fs.readFileSync(`${cachePath}/state${key}`, 'utf8')
    return JSON.parse(data)
  } catch (e) {
    return {}
  }
}

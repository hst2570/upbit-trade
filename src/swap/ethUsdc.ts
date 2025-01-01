import { CurrencyAmount, Percent, Token } from '@uniswap/sdk-core'
import { NonfungiblePositionManager, Pool, Position } from '@uniswap/v3-sdk'
import { ContractRunner, ethers, JsonRpcProvider, Wallet } from 'ethersV6'
import JSBI from 'jsbi'
import ENV from '../../env'
import { sendNotification } from '../notification'
import { NONFUNGIBLE_POSITION_MANAGER_ABI, POOL_ABI } from './constants/abi'
import {
  ARBITRUM_CHAIN_ID,
  NONFUNGIBLE_POSITION_MANAGER_ADDRESS,
  POOL_ADDRESS,
  USDC_ADDRESS,
  WETH_ADDRESS,
} from './constants/contract'
import { executeRoute } from './routing'

const { SWAP } = ENV
const { PRIVATE_KEY, RPC, MIN, MAX } = SWAP

const MaxUint128 = BigInt('0xffffffffffffffffffffffffffffffff')
const privateKey = PRIVATE_KEY || ''
const rpcUrl = RPC

const token0 = new Token(
  ARBITRUM_CHAIN_ID,
  WETH_ADDRESS,
  18,
  'WETH',
  'Wrapped Ether'
)
const token1 = new Token(ARBITRUM_CHAIN_ID, USDC_ADDRESS, 6, 'USDC', 'USD Coin')

export const run = async () => {
  try {
    const provider = new JsonRpcProvider(rpcUrl)
    const wallet = new Wallet(privateKey, provider)
    const walletAddress = wallet.address

    const positionManager = new ethers.Contract(
      NONFUNGIBLE_POSITION_MANAGER_ADDRESS,
      NONFUNGIBLE_POSITION_MANAGER_ABI,
      wallet
    )

    const poolContract = new ethers.Contract(POOL_ADDRESS, POOL_ABI, provider)

    const { tokenId, position: currentPosition } = (await getPools({
      positionManager,
      walletAddress,
    })) as {
      tokenId: string
      position: Position
    }
    const isPositionEmpty = tokenId ? false : true

    const slot = await currentTick(poolContract as any)
    const { tick: tickBig, sqrtPriceX96 } = slot
    const currentSqrtPriceX96 = sqrtPriceX96.toString()

    const tick = Number(tickBig)
    const currentToken0Price = Math.pow(1.0001, tick) * 1e12

    const newTickLower = Math.floor(
      Math.log((currentToken0Price / 1e12) * MIN) / Math.log(1.0001)
    )

    const newTickUpper = Math.floor(
      Math.log((currentToken0Price / 1e12) * MAX) / Math.log(1.0001)
    )

    if (isPositionEmpty) {
      await createPosition({
        provider,
        walletAddress,
        positionManager,
        newTickLower,
        newTickUpper,
        currentToken0Price,
      })
      return
    } else {
      const { tickLower, tickUpper, liquidity } = currentPosition || {}
      const liquidityAmount = JSBI.BigInt(liquidity.toString())
      const isLower = tick < tickLower
      const isUpper = tick > tickUpper
      const isOutOfRange = isLower || isUpper

      if (!isOutOfRange) {
        // sendNotification(`[현재 틱 범위 내...] ETH/USDC`)
        return
      } else {
        const pool = new Pool(
          token0,
          token1,
          500,
          currentSqrtPriceX96,
          liquidityAmount,
          tick
        )

        const position = new Position({
          pool,
          tickLower: Number(tickLower),
          tickUpper: Number(tickUpper),
          liquidity: liquidityAmount,
        })

        await closePosition({
          tokenId,
          position,
          positionManager,
          walletAddress,
          wallet,
        })

        await createPosition({
          provider,
          walletAddress,
          positionManager,
          newTickLower,
          newTickUpper,
          currentToken0Price,
        })
      }
    }
  } catch (error: unknown) {
    console.error(error)
    const message = (error as Error)?.message || ''
    sendNotification(`[!실패...] ETH/USDC \n\n ${message}`)
  }
}

const createPosition = async ({
  provider,
  walletAddress,
  positionManager,
  newTickLower,
  newTickUpper,
  currentToken0Price,
}: {
  provider: JsonRpcProvider
  walletAddress: string
  positionManager: ethers.Contract
  newTickLower: number
  newTickUpper: number
  currentToken0Price: number
}) => {
  await swapV2({
    provider,
    walletAddress,
    currentToken0Price,
    token0,
    token1,
  })

  await createNewPosition({
    provider,
    tickLower: newTickLower,
    tickUpper: newTickUpper,
    positionManager,
    walletAddress,
  })
}

const currentTick = async (poolContract: { slot0: () => any }) => {
  try {
    const slot0 = await poolContract.slot0()
    return slot0
  } catch (error) {
    throw new Error(`[!현재 틱 조회 실패...]`)
  }
}

const getPools = async ({
  positionManager,
  walletAddress,
}: {
  positionManager: ethers.Contract
  walletAddress: string
}) => {
  try {
    // 사용자가 소유한 NFT 개수
    const balance = await positionManager.balanceOf(walletAddress)

    // 사용자가 소유한 각 Token ID 및 관련 정보 가져오기
    for (let i = balance - 1n; i >= 0; i--) {
      const tokenId = await positionManager.tokenOfOwnerByIndex(
        walletAddress,
        i
      )
      const position = await positionManager.positions(tokenId)
      const { liquidity } = position

      if (liquidity > 0) {
        return { position, tokenId }
      }
    }

    return {}
  } catch (error) {
    throw new Error(`[!포지션 조회 실패...]`)
  }
}

async function closePosition({
  tokenId,
  position,
  positionManager,
  walletAddress,
  wallet,
}: {
  tokenId: string
  position: Position
  positionManager: ethers.Contract
  walletAddress: string
  wallet: Wallet
}) {
  try {
    const [fee0, fee1] = await positionManager.collect.staticCall({
      tokenId: tokenId,
      recipient: walletAddress,
      amount0Max: MaxUint128,
      amount1Max: MaxUint128,
    })

    const liquidityPercentage = new Percent('100', '100') // 유동성 100%
    const slippageTolerance = new Percent(50, 100_00) // 0.5%
    const expectedCurrencyOwed0 = CurrencyAmount.fromRawAmount(
      token0,
      fee0.toString()
    )
    const expectedCurrencyOwed1 = CurrencyAmount.fromRawAmount(
      token1,
      fee1.toString()
    )

    const { calldata, value } = NonfungiblePositionManager.removeCallParameters(
      position,
      {
        tokenId: tokenId.toString(),
        liquidityPercentage,
        slippageTolerance,
        deadline: Math.floor(Date.now() / 1000) + 60 * 10,
        collectOptions: {
          expectedCurrencyOwed0,
          expectedCurrencyOwed1,
          recipient: walletAddress,
        },
      }
    )

    const params = {
      to: NONFUNGIBLE_POSITION_MANAGER_ADDRESS,
      from: walletAddress,
      data: calldata,
      value,
    }

    const gasEstimate = await wallet.estimateGas(params)

    const gasLimit = Number(gasEstimate) * 1.5

    const tx = await wallet.sendTransaction({
      ...params,
      gasLimit: gasLimit.toFixed(0),
    })
    await tx.wait()
  } catch (error) {
    throw new Error(`[!포지션 종료 실패...]`)
  }
}

async function createNewPosition({
  provider,
  tickLower,
  tickUpper,
  positionManager,
  walletAddress,
}: {
  provider: JsonRpcProvider
  tickLower: number
  tickUpper: number
  positionManager: ethers.Contract
  walletAddress: string
}) {
  try {
    const { amount0, amount1 } = await setupAmounts(
      provider,
      token0.address,
      token1.address,
      walletAddress
    )
    const deadline = Math.floor(Date.now() / 1000) + 60 * 10 // 10분 내 실행 제한

    // 포지션 생성
    const params = {
      token0: token0.address,
      token1: token1.address,
      fee: 500,
      tickLower: Math.ceil(tickLower / 10) * 10,
      tickUpper: Math.ceil(tickUpper / 10) * 10,
      amount0Desired: amount0,
      amount1Desired: amount1,
      amount0Min: BigInt(0),
      amount1Min: BigInt(0),
      recipient: walletAddress,
      deadline,
    }

    await positionManager.mint(params)
    sendNotification(
      `[새로운 포지션 생성 완료] ${token0.symbol}/${token1.symbol} \n\n tick: ${tickLower} ~ ${tickUpper}`
    )
  } catch (error) {
    throw new Error(`[!새로운 포지션 생성 실패...]`)
  }
}

async function getERC20Balance(
  tokenAddress: string,
  walletAddress: string,
  provider: ContractRunner
): Promise<bigint> {
  const abi = ['function balanceOf(address account) view returns (uint256)']
  const contract = new ethers.Contract(tokenAddress, abi, provider)
  const balance: bigint = await contract.balanceOf(walletAddress)
  return balance // BigInt 반환
}

async function setupAmounts(
  provider: ContractRunner,
  token0Address: string,
  token1Address: string,
  walletAddress: string
): Promise<{ amount0: bigint; amount1: bigint }> {
  // 잔액 조회
  const amount0: bigint = await getERC20Balance(
    token0Address,
    walletAddress,
    provider
  )
  const amount1: bigint = await getERC20Balance(
    token1Address,
    walletAddress,
    provider
  )

  return { amount0, amount1 }
}

async function swapV2({
  provider,
  walletAddress,
  token0,
  token1,
  currentToken0Price,
}: {
  provider: JsonRpcProvider
  walletAddress: string
  currentToken0Price: number
  token0: Token
  token1: Token
}) {
  try {
    const { amount0, amount1 } = await setupAmounts(
      provider,
      token0.address,
      token1.address,
      walletAddress
    )

    const token0Amount = Number(amount0) / 1e18
    const calToken0Amount = token0Amount * currentToken0Price
    const token1Amount = Number(amount1) / 1e6
    const isTargetToken0 = calToken0Amount > token1Amount
    const half = Number(calToken0Amount + token1Amount) / 2

    const amountIn = isTargetToken0
      ? ((calToken0Amount - half) / currentToken0Price).toFixed(18)
      : (token1Amount - half).toFixed(6)
    const decimals = isTargetToken0 ? 18 : 6

    await executeRoute({
      walletAddress,
      targetToken: isTargetToken0 ? token0 : token1,
      elseToken: isTargetToken0 ? token1 : token0,
      amountIn: Number(amountIn),
      decimals,
    })
  } catch (error) {
    const message = (error as Error)?.message || ''
    throw new Error(`[!스왑 실패...] \n\n ${message}`)
  }
}

// run()

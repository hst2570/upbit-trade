import { CurrencyAmount, Percent, Token } from '@uniswap/sdk-core'
import { NonfungiblePositionManager, Pool, Position } from '@uniswap/v3-sdk'
import { ethers, JsonRpcProvider, Wallet } from 'ethers'
import JSBI from 'jsbi'
import {
  NONFUNGIBLE_POSITION_MANAGER_ABI,
  POOL_ABI,
  SWAP_ROUTER_ABI,
} from './constants/abi'
import {
  ARBITRUM_CHAIN_ID,
  NONFUNGIBLE_POSITION_MANAGER_ADDRESS,
  POOL_ADDRESS,
  SWAP_ROUTER_ADDRESS,
  USDC_ADDRESS,
  WETH_ADDRESS,
} from './constants/contract'
import ENV from '../../env'
import { sendNotification } from '../notification'

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
    const { tickLower, tickUpper, liquidity } = currentPosition
    const liquidityAmount = JSBI.BigInt(liquidity.toString())

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

    const isLower = tick < tickLower
    const isUpper = tick > tickUpper
    const isOutOfRange = isLower || isUpper

    if (!isOutOfRange) {
      sendNotification(`[현재 틱 범위 내...] ETH/USDC`)
      return
    } else {
      await closePosition({
        tokenId,
        position,
        positionManager,
        walletAddress,
        wallet,
      })

      await swap({
        isUpper,
        wallet,
        provider,
        walletAddress,
      })

      const { amount0, amount1 } = await setupAmounts(
        provider,
        WETH_ADDRESS,
        USDC_ADDRESS,
        walletAddress
      )

      await createArbitrumPosition({
        amount0,
        amount1,
        tickLower: newTickLower,
        tickUpper: newTickUpper,
        positionManager,
        walletAddress,
      })
    }
  } catch (error) {
    sendNotification(`[!실패...] ETH/USDC`)
  }
}

const currentTick = async (poolContract: { slot0: () => any }) => {
  try {
    const slot0 = await poolContract.slot0()
    return slot0
  } catch (error) {
    sendNotification(`[!현재 틱 조회 실패...] ETH/USDC`)
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
    for (let i = 0; i < balance; i++) {
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
  } catch (error) {
    sendNotification(`[!포지션 조회 실패...] ETH/USDC`)
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
    const slippageTolerance = new Percent('5', '100') // 슬리피지 5%
    const expectedCurrencyOwed0 = CurrencyAmount.fromRawAmount(
      token0,
      fee0.toString()
    )
    const expectedCurrencyOwed1 = CurrencyAmount.fromRawAmount(
      token1,
      fee1.toString()
    )

    const params = NonfungiblePositionManager.removeCallParameters(position, {
      tokenId: tokenId.toString(),
      liquidityPercentage,
      slippageTolerance,
      deadline: Math.floor(Date.now() / 1000) + 60 * 10,
      collectOptions: {
        expectedCurrencyOwed0,
        expectedCurrencyOwed1,
        recipient: walletAddress,
      },
    })

    const tx = await wallet.sendTransaction({
      to: NONFUNGIBLE_POSITION_MANAGER_ADDRESS,
      from: walletAddress,
      data: params.calldata,
      value: params.value,
      gasLimit: 600000,
    })
    await tx.wait()
  } catch (error) {
    sendNotification(`[!포지션 종료 실패...] ETH/USDC`)
  }
}

async function swap({
  isUpper = false,
  wallet,
  provider,
  walletAddress,
}: {
  isUpper: boolean
  wallet: Wallet
  provider: JsonRpcProvider
  walletAddress: string
}) {
  try {
    const swapRouter = new ethers.Contract(
      SWAP_ROUTER_ADDRESS,
      SWAP_ROUTER_ABI,
      wallet
    )
    const targetCotractAddress = isUpper ? USDC_ADDRESS : WETH_ADDRESS
    const elseContractAddress = isUpper ? WETH_ADDRESS : USDC_ADDRESS

    const wethContract = new ethers.Contract(
      targetCotractAddress,
      ['function balanceOf(address owner) view returns (uint256)'],
      provider
    )
    const balance = await wethContract.balanceOf(walletAddress)
    const halfWeth = balance / 2n

    const approveAbi = [
      'function approve(address spender, uint256 amount) returns (bool)',
    ]
    const targetToken = new ethers.Contract(
      targetCotractAddress,
      approveAbi,
      wallet
    )
    const approveTx = await targetToken.approve(SWAP_ROUTER_ADDRESS, halfWeth)
    await approveTx.wait()

    const deadline = Math.floor(Date.now() / 1000) + 60 * 10 // 10분 내 실행 제한
    const amountOutMinimum = ethers.parseUnits(
      isUpper ? '1' : '0.0001',
      isUpper ? 6 : 18
    ) // 최소 슬리피지 방지

    const params = {
      tokenIn: targetCotractAddress,
      tokenOut: elseContractAddress,
      fee: 500, // 수수료 티어 0.05%
      recipient: walletAddress,
      deadline,
      amountIn: halfWeth, // 스왑할 WETH 양
      amountOutMinimum,
      sqrtPriceLimitX96: 0, // 가격 제한 없음
    }

    const swapTx = await swapRouter.exactInputSingle(params, { value: 0 })
    await swapTx.wait()
  } catch (error) {
    sendNotification(`[!스왑 실패...] ETH/USDC`)
  }
}

async function createArbitrumPosition({
  amount0,
  amount1,
  tickLower,
  tickUpper,
  positionManager,
  walletAddress,
}: {
  amount0: bigint
  amount1: bigint
  tickLower: number
  tickUpper: number
  positionManager: ethers.Contract
  walletAddress: string
}) {
  try {
    const deadline = Math.floor(Date.now() / 1000) + 60 * 10 // 10분 내 실행 제한

    // 포지션 생성
    const params = {
      token0: token0.address,
      token1: token1.address,
      fee: 500,
      tickLower: Math.floor(tickLower / 10) * 10,
      tickUpper: Math.floor(tickUpper / 10) * 10,
      amount0Desired: amount0,
      amount1Desired: amount1,
      amount0Min: BigInt(0),
      amount1Min: BigInt(0),
      recipient: walletAddress,
      deadline,
    }

    const tx = await positionManager.mint(params)
    sendNotification(`[새로운 포지션 생성 완료] ETH/USDC`)
  } catch (error) {
    sendNotification(`[!새로운 포지션 생성 실패...] ETH/USDC`)
  }
}

async function getERC20Balance(
  tokenAddress: string,
  walletAddress: string,
  provider: JsonRpcProvider
): Promise<bigint> {
  const abi = ['function balanceOf(address account) view returns (uint256)']
  const contract = new ethers.Contract(tokenAddress, abi, provider)
  const balance: bigint = await contract.balanceOf(walletAddress)
  return balance // BigInt 반환
}

async function setupAmounts(
  provider: JsonRpcProvider,
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

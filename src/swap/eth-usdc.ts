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

const { SWAP } = ENV

const MaxUint128 = BigInt('0xffffffffffffffffffffffffffffffff')
const privateKey = SWAP.PRIVATE_KEY || ''
const rpcUrl = SWAP.RPC
const provider = new JsonRpcProvider(rpcUrl)
const wallet = new Wallet(privateKey, provider)
const walletAddress = wallet.address

const token0 = new Token(
  ARBITRUM_CHAIN_ID,
  WETH_ADDRESS,
  18,
  'WETH',
  'Wrapped Ether'
)
const token1 = new Token(ARBITRUM_CHAIN_ID, USDC_ADDRESS, 6, 'USDC', 'USD Coin')

const run = async () => {
  // NonfungiblePositionManager 컨트랙트 인스턴스
  const positionManager = new ethers.Contract(
    NONFUNGIBLE_POSITION_MANAGER_ADDRESS,
    NONFUNGIBLE_POSITION_MANAGER_ABI,
    wallet
  )

  const poolContract = new ethers.Contract(POOL_ADDRESS, POOL_ABI, provider)

  const { tokenId, position: currentPosition } = (await getPools(
    positionManager
  )) as {
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
    Math.log((currentToken0Price / 1e12) * 0.985) / Math.log(1.0001)
  )

  const newTickUpper = Math.floor(
    Math.log((currentToken0Price / 1e12) * 1.015) / Math.log(1.0001)
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
    console.log('현재 틱이 범위 내에 있습니다.')
    return
  } else {
    await closePosition({
      tokenId,
      position,
      positionManager,
    })

    await swap({
      isUpper,
    })

    // // 내 지갑에서 조회
    const { amount0, amount1 } = await setupAmounts(
      provider,
      WETH_ADDRESS,
      USDC_ADDRESS
    )

    await createArbitrumPosition({
      amount0,
      amount1,
      tickLower: newTickLower,
      tickUpper: newTickUpper,
      positionManager,
    })
  }
}

// positionManager을 사용해서 현재 tick 정보 가져오기
const currentTick = async (poolContract: { slot0: () => any }) => {
  try {
    const slot0 = await poolContract.slot0()
    return slot0
  } catch (error) {
    console.error('오류 발생:', error)
  }
}

const getPools = async (positionManager: any) => {
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
    console.error('오류 발생:', error)
  }
}

async function closePosition({
  tokenId,
  position,
  positionManager,
}: {
  tokenId: string
  position: Position
  positionManager: ethers.Contract
}) {
  try {
    const [fee0, fee1] = await positionManager.collect.staticCall({
      tokenId: tokenId,
      recipient: walletAddress,
      amount0Max: MaxUint128,
      amount1Max: MaxUint128,
    })

    // console.log("Estimated gas:", gas.toString());
    console.log(`Fees earned - Token 1: ${fee0}, Token 2: ${fee1}`)

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

    console.log('포지션 종료 트랜잭션 보내는 중...', params)

    const tx = await wallet.sendTransaction({
      to: NONFUNGIBLE_POSITION_MANAGER_ADDRESS,
      from: walletAddress,
      data: params.calldata,
      value: params.value,
      gasLimit: 100000,
    })
    await tx.wait()
  } catch (error) {
    console.error('포지션 종료 중 오류 발생:', error)
    throw error
  }
}

async function swap({ isUpper = false }: { isUpper: boolean }) {
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
    const amountOutMinimum = ethers.parseUnits('1', isUpper ? 6 : 18) // 최소 1 USDC (슬리피지 방지)
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
    const receipt = await swapTx.wait()
    console.log('스왑 완료:', receipt)
  } catch (error) {
    console.error('스왑 실행 중 오류 발생:', error)
    throw error
  }
}

async function createArbitrumPosition({
  amount0,
  amount1,
  tickLower,
  tickUpper,
  positionManager,
}: {
  amount0: bigint
  amount1: bigint
  tickLower: number
  tickUpper: number
  positionManager: ethers.Contract
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
    console.log('포지션 생성 완료:', tx)
  } catch (error) {
    console.error('포지션 생성 중 오류 발생:', error)
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
  token1Address: string
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

run()

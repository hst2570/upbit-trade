import { CurrencyAmount, Percent, Token } from '@uniswap/sdk-core'
import { NonfungiblePositionManager, Pool, Position } from '@uniswap/v3-sdk'
import { ContractRunner, ethers, JsonRpcProvider, Wallet } from 'ethers'
import JSBI from 'jsbi'
import ENV from '../../env'
import { sendNotification } from '../notification'
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
        wallet,
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
          wallet,
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
    const message = (error as Error)?.message || ''
    sendNotification(`[!실패...] ETH/USDC \n\n ${message}`)
  }
}

const createPosition = async ({
  wallet,
  provider,
  walletAddress,
  positionManager,
  newTickLower,
  newTickUpper,
  currentToken0Price,
}: {
  wallet: Wallet
  provider: JsonRpcProvider
  walletAddress: string
  positionManager: ethers.Contract
  newTickLower: number
  newTickUpper: number
  currentToken0Price: number
}) => {
  await swap({
    wallet,
    provider,
    walletAddress,
    currentToken0Price,
  })

  const { amount0, amount1 } = await setupAmounts(
    provider,
    WETH_ADDRESS,
    USDC_ADDRESS,
    walletAddress
  )

  await createNewPosition({
    amount0,
    amount1,
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
    throw new Error(`[!현재 틱 조회 실패...] ETH/USDC`)
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
    throw new Error(`[!포지션 조회 실패...] ETH/USDC`)
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
    throw new Error(`[!포지션 종료 실패...] ETH/USDC`)
  }
}

async function swap({
  wallet,
  provider,
  walletAddress,
  currentToken0Price,
}: {
  wallet: Wallet
  provider: JsonRpcProvider
  walletAddress: string
  currentToken0Price: number
}) {
  try {
    const { amount0: weth, amount1: usdc } = await setupAmounts(
      provider,
      WETH_ADDRESS,
      USDC_ADDRESS,
      walletAddress
    )

    const ethAmount = Number(weth) / 1e18
    const myEthAmount = ethAmount * currentToken0Price
    const usdcAmount = Number(usdc) / 1e6
    const half = Number(myEthAmount + usdcAmount) / 2
    const isTargetEth = myEthAmount > usdcAmount
    const targetAmount = isTargetEth
      ? ethers.parseUnits(
          ((myEthAmount - half) / currentToken0Price).toFixed(18).toString(),
          18
        )
      : ethers.parseUnits((usdcAmount - half).toFixed(6).toString(), 6)
    const elseAmount = !isTargetEth
      ? ethers.parseUnits(
          (((half - myEthAmount) / currentToken0Price) * 0.95)
            .toFixed(18)
            .toString(),
          18
        )
      : ethers.parseUnits(((half - usdcAmount) * 0.95).toFixed(6).toString(), 6)

    const targetCotractAddress = isTargetEth ? WETH_ADDRESS : USDC_ADDRESS
    const elseContractAddress = isTargetEth ? USDC_ADDRESS : WETH_ADDRESS

    const swapRouter = new ethers.Contract(
      SWAP_ROUTER_ADDRESS,
      SWAP_ROUTER_ABI,
      wallet
    )

    const approveAbi = [
      'function approve(address spender, uint256 amount) returns (bool)',
    ]
    const targetToken = new ethers.Contract(
      targetCotractAddress,
      approveAbi,
      wallet
    )
    const approveTx = await targetToken.approve(
      SWAP_ROUTER_ADDRESS,
      targetAmount
    )
    await approveTx.wait()

    const deadline = Math.floor(Date.now() / 1000) + 60 * 10 // 10분 내 실행 제한

    const params = {
      tokenIn: targetCotractAddress,
      tokenOut: elseContractAddress,
      fee: 500, // 수수료 티어 0.05%
      recipient: walletAddress,
      deadline,
      amountIn: targetAmount,
      amountOutMinimum: elseAmount,
      sqrtPriceLimitX96: 0, // 가격 제한 없음
    }

    const swapTx = await swapRouter.exactInputSingle(params, {
      value: 0,
    })
    await swapTx.wait()
  } catch (error) {
    throw new Error(`[!스왑 실패...] ETH/USDC`)
  }
}

async function createNewPosition({
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
    sendNotification(`[새로운 포지션 생성 완료] ETH/USDC`)
  } catch (error) {
    throw new Error(`[!새로운 포지션 생성 실패...] ETH/USDC`)
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

// const swapUsingUniversalRouter = async ({
//   walletAddress,
//   provider,
//   currentToken0Price,
// }: {
//   walletAddress: string
//   provider: ContractRunner
//   currentToken0Price: number
// }) => {
//   try {
//     // const commands = '0x000604'
//     const commands = '0x000604'

//     const { amount0: weth, amount1: usdc } = await setupAmounts(
//       provider,
//       WETH_ADDRESS,
//       USDC_ADDRESS,
//       walletAddress
//     )

//     const ethAmount = Number(weth) / 1e18
//     const usdcAmount = Number(usdc) / 1e6
//     const half = Number(ethAmount * currentToken0Price + usdcAmount) / 2
//     const amountEth = ethers.parseUnits(
//       Number(half / currentToken0Price).toString(),
//       18
//     )
//     const amountUSDC = ethers.parseUnits(half.toFixed(6).toString(), 6)

//     const targetCotractAddress =
//       ethAmount > usdcAmount ? WETH_ADDRESS : USDC_ADDRESS
//     const amountIn = ethAmount > usdcAmount ? amountEth : amountUSDC
//     const elseContractAddress =
//       ethAmount > usdcAmount ? USDC_ADDRESS : WETH_ADDRESS
//     const amountOutMin = ethAmount > usdcAmount ? amountUSDC : amountEth

//     const path = ethers.solidityPacked(
//       ['address', 'uint24', 'address'],
//       [targetCotractAddress, 500, elseContractAddress]
//     )

//     const payPortionRecipient = walletAddress // 지불받을 주소
//     const payPortionValue = amountIn
//     const percentageInBasisPoints = amountIn

//     const sweepRecipient = walletAddress // 잔여 토큰 받을 주소
//     const sweepToken = elseContractAddress // 잔여 토큰 주소 (USDC)
//     const abiCoder = new AbiCoder()

//     const inputs = [
//       // V3_SWAP_EXACT_IN
//       abiCoder.encode(
//         ['address', 'uint256', 'uint256', 'bytes', 'bool'],
//         [walletAddress, amountIn, amountOutMin / 2n, path, true]
//       ),
//       // PAY_PORTION
//       abiCoder.encode(
//         ['address', 'address', 'uint256'],
//         [targetCotractAddress, walletAddress, 5000]
//       ),
//       // SWEEP
//       abiCoder.encode(
//         ['address', 'address', 'uint256'],
//         [walletAddress, sweepToken, ethers.getUint(0n)]
//       ),
//     ]

//     const universalRouterContract = new ethers.Contract(
//       UNIVERSAL_ROUTER_ADDRESS,
//       UNIVERSAL_ROUTER_ABI,
//       provider
//     )

//     const deadline = Math.floor(Date.now() / 1000) + 60 * 10 // 10분 내 실행 제한

//     const tx = await universalRouterContract.execute.staticCall(
//       commands,
//       inputs,
//       deadline
//     )

//     const result = await tx.wait()
//     console.log(result)
//   } catch (error) {
//     console.error(error)
//     throw new Error(`[!유니버셜 라우터 스왑 실패...] ETH/USDC`)
//   }
// }

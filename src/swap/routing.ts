import { CurrencyAmount, Percent, Token, TradeType } from '@uniswap/sdk-core'
import {
  AlphaRouter,
  AlphaRouterConfig,
  SwapOptionsSwapRouter02,
  SwapOptionsUniversalRouter,
  SwapRoute,
  SwapType,
} from '@uniswap/smart-order-router'

import { BaseProvider } from '@ethersproject/providers'
import { BigNumber, ethers, Wallet } from 'ethers'
import JSBI from 'jsbi'
import ENV from '../../env'
import { ARBITRUM_CHAIN_ID, V3_SWAP_ROUTER_ADDRESS } from './constants/contract'
import { DEFAULT_ROUTING_CONFIG_BY_CHAIN } from './constants/config'
import { UniversalRouterVersion } from '@uniswap/universal-router-sdk'

const ERC20_ABI = [
  // Read-Only Functions
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',

  // Authenticated Functions
  'function transfer(address to, uint amount) returns (bool)',
  'function approve(address _spender, uint256 _value) returns (bool)',

  // Events
  'event Transfer(address indexed from, address indexed to, uint amount)',
]

const { SWAP } = ENV
const { PRIVATE_KEY, RPC } = SWAP

const privateKey = PRIVATE_KEY || ''
const rpcUrl = RPC
const Protocol = {
  V2: 'V2',
  V3: 'V3',
  V4: 'V4',
  MIXED: 'MIXED',
}

const ROUTING_CONFIG: AlphaRouterConfig = {
  // @ts-ignore[TS7053] - complaining about switch being non exhaustive
  ...DEFAULT_ROUTING_CONFIG_BY_CHAIN[ARBITRUM_CHAIN_ID],
  // protocols: [Protocol.V3, Protocol.V2],
  // saveTenderlySimulationIfFailed: true, // save tenderly simulation on integ-test runs, easier for debugging
}

function parseDeadline(deadlineOrPreviousBlockhash: number): number {
  return Math.floor(Date.now() / 1000) + deadlineOrPreviousBlockhash
}

async function generateRoute({
  wallet,
  walletAddress,
  targetToken,
  elseToken,
  amountIn,
  decimals,
}: {
  wallet: Wallet
  walletAddress: string
  targetToken: Token
  elseToken: Token
  amountIn: number
  decimals: number
}): Promise<SwapRoute | null> {
  const router = new AlphaRouter({
    chainId: ARBITRUM_CHAIN_ID,
    provider: wallet.provider as BaseProvider,
  })

  // const options: SwapOptionsSwapRouter02 = {
  //   recipient: walletAddress,
  //   slippageTolerance: new Percent(50, 10_000),
  //   type: SwapType.SWAP_ROUTER_02,
  //   deadline: Math.floor(Date.now() / 1000) + 60 * 20,
  // }

  const options: SwapOptionsUniversalRouter = {
    type: SwapType.UNIVERSAL_ROUTER,
    version: UniversalRouterVersion.V2_0,
    recipient: walletAddress,
    slippageTolerance: new Percent(50, 10_000),
    deadlineOrPreviousBlockhash: parseDeadline(360),
    fee: {
      recipient: targetToken.address,
      fee: new Percent(12, 10000),
    },
  }

  const amount = CurrencyAmount.fromRawAmount(
    targetToken,
    fromReadableAmount(amountIn, decimals).toString()
  )

  const route = await router.route(
    amount,
    elseToken,
    TradeType.EXACT_INPUT,
    options,
    {
      ...ROUTING_CONFIG,
    }
  )

  return route
}

function fromReadableAmount(amount: number, decimals: number): JSBI {
  const extraDigits = Math.pow(10, countDecimals(amount))
  const adjustedAmount = amount * extraDigits
  return JSBI.divide(
    JSBI.multiply(
      JSBI.BigInt(adjustedAmount),
      JSBI.exponentiate(JSBI.BigInt(10), JSBI.BigInt(decimals))
    ),
    JSBI.BigInt(extraDigits)
  )
}

function countDecimals(x: number) {
  if (Math.floor(x) === x) {
    return 0
  }
  return x.toString().split('.')[1].length || 0
}

export async function executeRoute({
  walletAddress,
  targetToken,
  elseToken,
  amountIn,
  decimals,
}: {
  walletAddress: string
  targetToken: Token
  elseToken: Token
  amountIn: number
  decimals: number
}) {
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl)
  const wallet = new Wallet(privateKey, provider)
  const { methodParameters } = (await generateRoute({
    wallet,
    walletAddress,
    targetToken,
    elseToken,
    amountIn,
    decimals,
  })) || {
    methodParameters: {
      to: '',
      calldata: '',
      value: 0,
    },
  }
  const { to, calldata, value } = methodParameters!

  await getTokenTransferApproval({
    token: targetToken,
    wallet,
    walletAddress,
    amount: amountIn,
  })

  const MAX_FEE_PER_GAS = 100000000
  const MAX_PRIORITY_FEE_PER_GAS = 100000000

  // const params = {
  //   data: route?.methodParameters?.calldata,
  //   to: V3_SWAP_ROUTER_ADDRESS,
  //   value: route?.methodParameters?.value,
  //   from: walletAddress,
  //   maxFeePerGas: MAX_FEE_PER_GAS,
  //   maxPriorityFeePerGas: MAX_PRIORITY_FEE_PER_GAS,
  // }

  // const transaction = {
  //   data: methodParameters.calldata,
  //   to: methodParameters.to,
  //   value: BigNumber.from(methodParameters.value),
  //   from: alice._address,
  //   gasPrice: BigNumber.from(2000000000000),
  //   type: 1,
  // };

  const params = {
    to,
    data: calldata,
    value: BigNumber.from(value),
    from: walletAddress,
    maxFeePerGas: MAX_FEE_PER_GAS,
    maxPriorityFeePerGas: MAX_PRIORITY_FEE_PER_GAS,
  }
  const gasEstimate = await wallet.estimateGas(params)
  const gasLimit = Number(gasEstimate) * 1.5
  const tx = await wallet.sendTransaction({
    ...params,
    gasLimit: gasLimit.toFixed(0),
  })

  await tx.wait()
}

async function getTokenTransferApproval({
  token,
  wallet,
  walletAddress,
  amount,
}: {
  token: Token
  wallet: ethers.Wallet
  walletAddress: string
  amount: number
}) {
  const tokenContract = new ethers.Contract(token.address, ERC20_ABI, wallet)

  const transaction = await tokenContract.populateTransaction.approve(
    V3_SWAP_ROUTER_ADDRESS,
    fromReadableAmount(amount, token.decimals).toString()
  )

  const tx = await wallet.sendTransaction({
    ...transaction,
    from: walletAddress,
  })
  await tx.wait()
}

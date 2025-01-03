import { ethers } from 'ethersV6'
import ENV from '../../env'
import { USDC_ADDRESS } from '../swap/constants/contract'
import { AAVE_LENDING_POOL_ABI } from './constants/abi'
import { AAVE_LENDING_POOL_ADDRESS } from './constants/contract'

// 사용자 환경 설정
const { SWAP } = ENV
const { PRIVATE_KEY, RPC: PROVIDER_URL } = SWAP

export async function withdrawFromAave() {
  try {
    // 1. 이더리움 공급자 및 월렛 생성
    const provider = new ethers.JsonRpcProvider(PROVIDER_URL)
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider)

    // 2. Aave Lending Pool 컨트랙트 인스턴스 생성
    const aaveLendingPool = new ethers.Contract(
      AAVE_LENDING_POOL_ADDRESS,
      AAVE_LENDING_POOL_ABI,
      wallet
    )

    console.log('Withdrawing USDC from Aave...')
    const withdrawTx = await aaveLendingPool.withdraw(
      USDC_ADDRESS,
      ethers.MaxUint256,
      wallet.address
    )
    await withdrawTx.wait()
    console.log('USDC withdrawn successfully.')
  } catch (error) {
    console.error('Error withdrawing from Aave:', error)
  }
}

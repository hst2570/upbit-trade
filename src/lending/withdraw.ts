import { ethers } from 'ethersV6'
import ENV from '../../env'
import { USDC_ADDRESS } from '../swap/constants/contract'
import { AAVE_LENDING_POOL_ABI } from './constants/abi'
import { AAVE_LENDING_POOL_ADDRESS } from './constants/contract'

// 사용자 환경 설정
const { SWAP } = ENV
const { PRIVATE_KEY, RPC: PROVIDER_URL } = SWAP

async function withdrawFromAave() {
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

    // 3. 해제할 USDC 금액 설정 (단위: 6자리 소수점)
    const withdrawAmount = ethers.parseUnits('1000', 6) // 예: 1000 USDC
    // 모든 예치금을 해제하려면 아래 줄 사용
    // const withdrawAmount = ethers.constants.MaxUint256;

    // 4. Aave에서 USDC 해제 (Withdraw)
    console.log('Withdrawing USDC from Aave...')
    const withdrawTx = await aaveLendingPool.withdraw(
      USDC_ADDRESS,
      withdrawAmount,
      wallet.address
    )
    await withdrawTx.wait()
    console.log('USDC withdrawn successfully.')
  } catch (error) {
    console.error('Error withdrawing from Aave:', error)
  }
}

// 실행
withdrawFromAave()

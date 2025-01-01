import { ethers } from 'ethersV6'
import ENV from '../../env'
import { USDC_ADDRESS } from '../swap/constants/contract'
import { AAVE_LENDING_POOL_ABI, ERC20_ABI } from './constants/abi'
import { AAVE_LENDING_POOL_ADDRESS } from './constants/contract'

// 사용자 환경 설정
const { SWAP } = ENV
const { PRIVATE_KEY, RPC: PROVIDER_URL } = SWAP

async function depositToAave() {
  try {
    // 1. 이더리움 공급자 및 월렛 생성
    const provider = new ethers.JsonRpcProvider(PROVIDER_URL)
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider)

    // 2. ERC-20 컨트랙트 인스턴스 생성
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, wallet)

    // 3. Aave Lending Pool 컨트랙트 인스턴스 생성
    const aaveLendingPool = new ethers.Contract(
      AAVE_LENDING_POOL_ADDRESS,
      AAVE_LENDING_POOL_ABI,
      wallet
    )

    // 4. 예치할 USDC 금액 (단위: 6자리 소수점)
    const depositAmount = ethers.parseUnits('1000', 6) // 예: 1000 USDC

    // 5. USDC 승인 (Approve)
    console.log('Approving USDC for Aave...')
    const approveTx = await usdcContract.approve(
      AAVE_LENDING_POOL_ADDRESS,
      depositAmount
    )
    await approveTx.wait()
    console.log('USDC approved.')

    // 6. Aave에 USDC 예치 (Deposit)
    console.log('Depositing USDC to Aave...')
    const depositTx = await aaveLendingPool.deposit(
      USDC_ADDRESS,
      depositAmount,
      wallet.address,
      0
    )
    await depositTx.wait()
    console.log('USDC deposited successfully.')
  } catch (error) {
    console.error('Error depositing to Aave:', error)
  }
}

// 실행
depositToAave()

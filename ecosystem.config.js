module.exports = {
  apps: [
    {
      name: 'buy-crypto',
      script: './batch/runner/runBuyCrypto.ts', // 실행할 스크립트
      interpreter: 'bun', // Bun 사용
      cron_restart: '0 9 * * *', // 매일 오전 9시에 실행
      watch: false,
    },
    {
      name: 'sell-crypto',
      script: './batch/runner/runSellCrypto.ts', // 실행할 스크립트
      interpreter: 'bun', // Bun 사용
      cron_restart: '* * * * * *', // 매초 실행
      watch: false,
    },
    {
      name: 'swap',
      script: './batch/runner/runSwap.ts', // 실행할 스크립트
      interpreter: 'bun',
      cron_restart: '0 22 * * *',
      watch: false,
    },
    {
      name: 'health-check',
      script: './batch/runner/runHealthCheck.ts', // 실행할 스크립트
      interpreter: 'bun',
      cron_restart: '0 9 * * *',
      watch: false,
    },
  ],
}

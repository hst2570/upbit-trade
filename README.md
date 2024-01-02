# UPBIT TRADING SCRIPT

## 사전 작업

1. 업비트 ACCESS_KEY, SECRET_KEY 키 발급
2. 업비트 API 키 발급 시 ip 등록은 배치를 돌릴 pc 기준으로 등록
3. env/index.ts -> ACCESS_KEY: '', SECRET_KEY: ''에 키 입력
4. (선택) env/index.ts -> 텔래그램 봇 토큰 정보 입력
5. HIGH_TRIGGER_RATE 익절, LOW_TRIGGER_RATE 손절 라인 작성 (1.14 -> 14% 이득, 0.98 -> 2% 손해)
6. (선택) 여러 코인 트레이딩 -> INVESTMENT_LIST에 알맞게 입력, INVESTMENT_RATIO 총 합이 1을 넘지 않게 주의

## running batch/cron

```bash
$ cp env/index.sample.ts env/index.ts
# edit and add env, env/index.sample.ts -> index.ts
$ bun install
$ bun run start
# 또는
$ bun run cronList
```

## ta

- 백로그 테스트용 스크립트
- scrap.js로 업비트 데이터 다운로드 가능 (코드 참고)
- caculate\_\*.js 로 백로그 테스트 가능, 이리저리 코드 고쳐가면서 테스트하면됌
- data -> 20\*\*.json -> 코인마켓캡 데이터
- data -> up -> 업비트 데이터
- NASDAQ -> 나스닥 데이터

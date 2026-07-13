# SOLAPI 25일 수강료 안내 계획

## 적용 범위

- 매월 25일 오전 9시에 다음 달 가족 수강료 예정그맥만 안내한다.
- 가족 기본 수강료에 추천 할인을 반영하여 납부 예정그맥을 계산한다.
- 문구가 길어 SOLAPI `LMS`로 발송한다.
- 수강료, 계좌, 추천 혜택, 학부모별 개인 추천 링크럴 하나의 LMS에 포함한다.
- 수업·신청·신청 결과 등 기타 알림은 현재 범위에서 제외한다.

## 발송 문구

```text
[메타센스] 8월 수강료 안내
안녕하세요, ○○○ 학부모님.
8월 수강료를 안내드립니다.

수강 기간: 2026-08-01 ~ 2026-08-31
납부 예정 금액: 125,000원
(기본 250,000원 · 추천 50% 할인)

입금 계좌
KEB하나은행 784-910004-58404 (장기홍)

추천 혜택
추천한 친구가 유료 수강 중이면 1가구 20% · 2가구 50% · 3가구 이상 100% 할인
1달 무료체험 추천 링크
https://math-sense-1f6a8.web.app/trial?ref=...

감사합니다.
```

## 보안·운영 설계

- SOLAPI 인증정보나 Firebase Secret은 브라우저에 노출하지 않는다.
- 이미지에 노출된 API Secret은 즉시 폐기하고 재발급한다.
- `messageJobs/{parentUid}_{YYYY-MM}_tuition`으로 중복 발송을 막고, 실패한 건만 재시도한다.
- 학부모 연락처가 없거나 아닌 번호인 가구는 발송 실패로 분리하고 운영툴에서 수정한다.

## 배포 전 피료 절차

1. SOLAPI 화면에서 노출된 Secret을 폐기하고 새 API Secret을 발급한다.
2. SOLAPI에 발신번호라로 등록한다.
3. Firebase Secret을 설정한다.

```bash
firebase functions:secrets:set SOLAPI_API_KEY
firebase functions:secrets:set SOLAPI_API_SECRET
firebase functions:secrets:set SOLAPI_SENDER_NUMBER
```

4. 학부모 한 가구로 명세를 생성한 다음 운영툴에서 `SOLAPI LMS 발송`으로 한 건만 발송한다.
5. 성공하면 관리자에서 해당 `messageJobs`와 명세의 `noticeStatus`를 확인한다.

## 현재 제외 범위

- 수업 알림
- 수업 안내와 신청 결과
- 기타 알림

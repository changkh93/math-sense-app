# 우주 방어대 커리큘럼 유지보수

학생용 자료는 `public/space-invaders/README.md` 및 각 Data Log를 사용합니다. 이 폴더는 제작·검수 원본입니다.

1. `python3 scripts/build-space-invaders-curriculum.py`: 강의 진행 순서의 모델 편집으로 31개 누적 코드, 15개 임시 시험, 10개 Data Log를 함께 생성합니다. `reference-final.py`는 메서드 추출용 입력이며 학생에게 제공하는 최종 코드는 `checkpoints/final-main.py`입니다.
2. `python3 scripts/prepare-space-invaders-assessments.py`: 보존한 01 초안의 문제은행을 검수된 내용으로 교정해 29개 Code Trace와 100개 퀴즈를 생성합니다.
3. `python3 scripts/verify-space-invaders-curriculum.py`: 편집 재현·문서 코드 일치·자료 경로·문항 구조·실제 Pygame 실행과 입력 처리를 검사합니다. 로컬 검수에 Pygame이 필요하며 학생의 설치 절차는 아닙니다.
4. `node scripts/package-space-invaders.mjs`: 공개 자료와 완성 비교 백업, 전체 ZIP을 다시 생성합니다.
5. `node scripts/register-space-invaders-curriculum.mjs`: DB에 접근하지 않고 140개 문서의 등록 계획을 생성합니다. `--apply`는 해당 커리큘럼만 운영 반영하고 모든 필드를 재조회 검증합니다. `--verify`는 읽기 검증만 합니다. 기존 문서에 관리 표식이 없으면 덮어쓰지 않습니다.
6. Hosting 배포 후 `node scripts/verify-space-invaders-production.mjs`: 운영 다운로드 파일과 원본의 HTTP 상태·SHA-256을 비교합니다.

원강의 진행 순서 근거, 외부 초안의 보존본과 반려 이유, 실제 검수 결과는 `docs/collaboration/tasks/20260909-space-invaders-curriculum/`에 있습니다. 빌드 성공을 브라우저 동작이나 수업의 정확성을 검증한 것으로 간주하지 않습니다.

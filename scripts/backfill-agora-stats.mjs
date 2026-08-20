import admin from 'firebase-admin';
import { readFileSync, existsSync } from 'fs';

const APPLY = process.argv.includes('--apply');
const MAINTENANCE_WINDOW_ACKNOWLEDGED = process.argv.includes('--maintenance-window');
const serviceAccountPath = './service-account.json';

if (APPLY && !MAINTENANCE_WINDOW_ACKNOWLEDGED) {
  throw new Error(
    '실시간 아고라 쓰기와 백필이 경합하면 증분이 유실될 수 있습니다. ' +
    '아고라 쓰기를 일시 중지한 유지보수 구간에서만 --apply --maintenance-window로 실행하세요.'
  );
}

if (!admin.apps.length) {
  if (existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  } else {
    admin.initializeApp();
  }
}

const db = admin.firestore();

async function backfillAgoraStats() {
  console.log('🚀 [Agora Stats Backfill] 시작...');
  console.log(`Mode: ${APPLY ? 'APPLY (실제 DB 쓰기)' : 'DRY-RUN (미리보기)'}`);

  // 1. 모든 질문 조회 및 유저별 질문 수 집계
  const questionsSnap = await db.collection('questions').get();
  const questionsMap = new Map(); // questionId -> { userId, isDeleted }
  const userQuestionCounts = new Map(); // userId -> count

  questionsSnap.docs.forEach((d) => {
    const data = d.data() || {};
    questionsMap.set(d.id, {
      userId: data.userId,
      isDeleted: Boolean(data.isDeleted)
    });
    if (data.userId) {
      userQuestionCounts.set(data.userId, (userQuestionCounts.get(data.userId) || 0) + 1);
    }
  });

  console.log(`총 질문 문서 수: ${questionsSnap.size}개`);

  // 2. 모든 답변 조회 및 유저별 고유 유효 답변 및 채택 수 집계
  const answersSnap = await db.collection('answers').get();
  const userUniqueAnsweredQuestions = new Map(); // userId -> Set<questionId>
  const userAcceptedCounts = new Map(); // userId -> count
  const userCreditDocsToCreate = new Map(); // userId -> Map<questionId, credit>

  answersSnap.docs.forEach((d) => {
    const data = d.data() || {};
    const answererUid = data.userId;
    if (!answererUid) return;

    // 답글은 제외
    if (data.parentAnswerId) return;

    // 교사/관리자 답변 제외
    if (data.isTeacher || answererUid === 'admin') return;

    const questionInfo = questionsMap.get(data.questionId);
    // Orphan answers must not create a contribution credit.
    if (!questionInfo) return;
    // 자문자답 제외
    if (questionInfo.userId === answererUid) return;

    // 채택된 답변 카운트
    if (data.isAccepted === true) {
      userAcceptedCounts.set(answererUid, (userAcceptedCounts.get(answererUid) || 0) + 1);
    }

    // 고유 질문 답변 인정 집계 (1질문당 1회)
    if (data.questionId) {
      if (!userUniqueAnsweredQuestions.has(answererUid)) {
        userUniqueAnsweredQuestions.set(answererUid, new Set());
        userCreditDocsToCreate.set(answererUid, new Map());
      }
      const set = userUniqueAnsweredQuestions.get(answererUid);
      const credits = userCreditDocsToCreate.get(answererUid);
      if (!set.has(data.questionId)) {
        set.add(data.questionId);
        credits.set(data.questionId, {
          questionId: data.questionId,
          firstAnswerId: d.id,
          answerCount: 1,
          creditedAt: data.createdAt || admin.firestore.FieldValue.serverTimestamp()
        });
      } else {
        const credit = credits.get(data.questionId);
        credit.answerCount += 1;
      }
    }
  });

  console.log(`총 답변 문서 수: ${answersSnap.size}개`);

  // 3. 모든 사용자 목록 조회
  const usersSnap = await db.collection('users').get();
  console.log(`총 사용자 수: ${usersSnap.size}명`);

  const summary = [];
  const bulkWriter = APPLY ? db.bulkWriter() : null;

  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;
    const userData = userDoc.data() || {};
    // questionCount is a lifetime achievement. Preserve a larger legacy value
    // because physically deleted zero-answer questions cannot be reconstructed.
    const questionCount = Math.max(
      userQuestionCounts.get(uid) || 0,
      Number(userData.questionCount || 0),
      Number(userData.agoraStats?.questionCount || 0)
    );
    const answeredQuestionCount = userUniqueAnsweredQuestions.get(uid)?.size || 0;
    const acceptedAnswerCount = userAcceptedCounts.get(uid) || 0;

    const existingStats = userData.agoraStats || {};
    const existingHelpCount = Number(userData.helpCount || 0);

    const hasChanged =
      existingStats.questionCount !== questionCount ||
      existingStats.answeredQuestionCount !== answeredQuestionCount ||
      existingStats.acceptedAnswerCount !== acceptedAnswerCount ||
      !existingStats.backfillComplete;

    if (hasChanged || questionCount > 0 || answeredQuestionCount > 0 || acceptedAnswerCount > 0) {
      summary.push({
        uid,
        name: userData.studentName || userData.name || userData.displayName || '익명',
        questionCount,
        answeredQuestionCount,
        acceptedAnswerCount,
        legacyHelpCount: existingHelpCount,
        creditsCount: userCreditDocsToCreate.get(uid)?.size || 0
      });
    }

    if (APPLY) {
      // 1) agoraAnswerCredits 서브컬렉션 문서 생성
      const credits = userCreditDocsToCreate.get(uid) || new Map();
      for (const credit of credits.values()) {
        const creditRef = db.collection('users').doc(uid).collection('agoraAnswerCredits').doc(credit.questionId);
        bulkWriter.set(creditRef, {
          questionId: credit.questionId,
          firstAnswerId: credit.firstAnswerId,
          answerCount: credit.answerCount,
          creditedAt: credit.creditedAt
        }, { merge: true });
      }

      // 2) users/{uid} agoraStats 필드 갱신
      bulkWriter.set(userDoc.ref, {
        agoraStats: {
          questionCount,
          answeredQuestionCount,
          acceptedAnswerCount,
          version: 1,
          backfillComplete: true,
          backfilledAt: admin.firestore.FieldValue.serverTimestamp()
        },
        helpCount: acceptedAnswerCount,
        questionCount
      }, { merge: true });
    }
  }

  if (bulkWriter) await bulkWriter.close();

  console.log('\n--- 📊 백필 대상 및 통계 요약 ---');
  console.table(summary.slice(0, 30));
  if (summary.length > 30) {
    console.log(`...외 ${summary.length - 30}명의 사용자 데이터 집계 완료`);
  }

  console.log(`\n✅ 백필 처리 완료 (총 ${summary.length}명 처리)`);
  if (!APPLY) {
    console.log('💡 실제 DB에 반영하려면 쓰기 중지 후 `node scripts/backfill-agora-stats.mjs --apply --maintenance-window`를 실행하세요.');
  }
}

backfillAgoraStats().catch((err) => {
  console.error('❌ 백필 실패:', err);
  process.exit(1);
});

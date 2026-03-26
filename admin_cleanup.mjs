
import admin from 'firebase-admin';
import { readFileSync } from 'fs';

// 1. 서비스 계정 키 파일 경로 (다운로드 후 이 파일명으로 저장하세요)
const SERVICE_ACCOUNT_PATH = './service-account.json';
const REGION_ID = 'reg_1774390167801';

try {
  const serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (err) {
  console.error("❌ 'service-account.json' 파일을 찾을 수 없거나 형식이 잘못되었습니다.");
  console.log("방법: Firebase 콘솔 > 프로젝트 설정 > 서비스 계정 > '새 비공개 키 생성' 후 이 폴더에 저장하세요.");
  process.exit(1);
}

const db = admin.firestore();

async function cleanupRegion() {
  console.log(`🚀 [월간평가 cleanup] 지역 ID: ${REGION_ID} 데이터 정리를 시작합니다...`);

  // 1. 해당 지역에 속한 챕터와 유닛 찾기
  const chaptersSnap = await db.collection('chapters').where('regionId', '==', REGION_ID).get();
  const chapterIds = chaptersSnap.docs.map(d => d.id);
  console.log(`- 찾은 챕터: ${chapterIds.length}개`);

  if (chapterIds.length === 0) {
    console.log("❌ 해당 지역에 챕터가 없습니다. ID를 확인해 주세요.");
    return;
  }

  const unitsSnap = await db.collection('units').where('chapterId', 'in', chapterIds).get();
  const unitIds = unitsSnap.docs.map(d => d.id);
  console.log(`- 찾은 유닛: ${unitIds.length}개`);

  // 2. 전체 history 컬렉션 그룹에서 해당 지역 기록 찾기
  const historySnap = await db.collectionGroup('history').where('regionId', '==', REGION_ID).get();
  console.log(`- 삭제할 퀴즈 기록(history): ${historySnap.size}개`);

  const affectedUserIds = new Set();
  const batchSize = 400;
  let batch = db.batch();
  let count = 0;

  // History 삭제 및 대상 유저 수집
  for (const doc of historySnap.docs) {
    const userId = doc.ref.parent.parent.id;
    affectedUserIds.add(userId);
    batch.delete(doc.ref);
    count++;

    if (count % batchSize === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  if (count % batchSize !== 0) await batch.commit();
  console.log(`✅ ${count}개의 퀴즈 기록 삭제 완료.`);

  // 3. 각 유저의 learning_progress 삭제 및 통계 재계산
  console.log(`🔄 ${affectedUserIds.size}명의 학생 통계 재계산 중...`);
  
  for (const userId of affectedUserIds) {
    const userRef = db.collection('users').doc(userId);
    const progressColl = userRef.collection('learning_progress');

    // 해당 유닛들의 진행 상황 삭제
    for (const unitId of unitIds) {
      await progressColl.doc(unitId).delete();
    }

    // 통계 재계산 (남은 history 기반)
    const remainingHistory = await userRef.collection('history').where('type', '==', 'quiz').get();
    const historyDocs = remainingHistory.docs;
    
    const totalQuizzes = historyDocs.length;
    const totalScore = historyDocs.reduce((sum, d) => sum + (d.data().score || 0), 0);
    const averageScore = totalQuizzes > 0 ? totalScore / totalQuizzes : 0;
    const perfectCount = historyDocs.filter(d => d.data().score === 100).length;

    await userRef.update({
      totalQuizzes,
      totalScore,
      averageScore: Math.round(averageScore * 10) / 10,
      perfectCount,
      lastActive: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`  - [${userId}] 정산 완료 (퀴즈: ${totalQuizzes}회)`);
  }

  console.log("\n✨ 모든 작업이 완료되었습니다!");
  console.log("⚠️ 광석(crystals)과 트랜잭션 기록은 유지되었습니다.");
}

cleanupRegion().catch(console.error);

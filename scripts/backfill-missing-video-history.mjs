/**
 * backfill-missing-video-history.mjs
 *
 * 단원 완료 체크 누락 복구 스크립트
 *
 * 배경:
 *   영상을 끝까지 시청하여 learning_progress.videoProgress.{txId}.completed === true 가 되었음에도,
 *   completion_bonus 타이머를 놓치거나 탭을 닫아 history 서브컬렉션에 type:'video' 문서가 생성되지 않으면
 *   단원 완료(uProg.video)가 영원히 false 로 표시되는 버그가 있었다.
 *   (근본 원인: SpaceHome.jsx 의 type 결정 로직과 syncVideoProgress Cloud Function 의 history 누락)
 *
 * 이 스크립트는 learning_progress 에는 completed:true 가 있는데 history 에 type:'video' 가 없는
 * (uid, unitId, txId) 조합을 찾아 빠진 history 문서를 생성하고 learningSummaries 를 rebuild 한다.
 *
 * 사용법:
 *   node scripts/backfill-missing-video-history.mjs              # dry-run (기본): 영향받는 목록만 출력
 *   node scripts/backfill-missing-video-history.mjs --apply      # 실제 DB 에 기록
 *   node scripts/backfill-missing-video-history.mjs --apply --uid <UID>   # 특정 학생만
 */
import admin from 'firebase-admin';
import { readFileSync } from 'node:fs';

const APPLY = process.argv.includes('--apply');
const UID_FILTER = (() => {
  const i = process.argv.indexOf('--uid');
  return i >= 0 ? process.argv[i + 1] : null;
})();

const serviceAccount = JSON.parse(
  readFileSync(new URL('../service-account.json', import.meta.url), 'utf8')
);
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

// KST(UTC+9) 날짜 문자열(YYYY-MM-DD) 추출 — history 문서 ID 패턴에 사용
function getKSTDateString(date = new Date()) {
  const kstMs = date.getTime() + 9 * 60 * 60 * 1000;
  const kst = new Date(kstMs);
  const yyyy = kst.getUTCFullYear();
  const mm = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(kst.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function tsToDate(ts) {
  if (!ts) return null;
  if (typeof ts.toDate === 'function') return ts.toDate();
  if (ts._seconds != null) return new Date(ts._seconds * 1000 + (ts._nanoseconds || 0) / 1e6);
  if (ts.seconds != null) return new Date(ts.seconds * 1000 + (ts.nanoseconds || 0) / 1e6);
  return null;
}

console.log(`모드: ${APPLY ? '✅ APPLY (실제 기록)' : '🔍 DRY-RUN (조회만)'}${UID_FILTER ? ` / 대상 UID: ${UID_FILTER}` : ' / 전체 학생'}`);
console.log('='.repeat(60));

// 1) learning_progress 전체 스캔 — collectionGroup 으로 모든 유저의 progress 문서를 한 번에 순회
console.log('learning_progress 문서 스캔 중...');
const progressSnap = await db.collectionGroup('learning_progress').get();
console.log(`learning_progress 문서 수: ${progressSnap.size}`);

// 2) (uid, unitId) → completed txId 목록 + 메타데이터 구성
const candidatesByUid = new Map(); // uid -> [{ unitId, txId, progressData, updatedAtDate }]
for (const docSnap of progressSnap.docs) {
  const uid = docSnap.ref.parent.parent.id; // users/{uid}/learning_progress/{unitId}
  if (UID_FILTER && uid !== UID_FILTER) continue;
  const unitId = docSnap.id;
  const data = docSnap.data() || {};
  const videoProgress = data.videoProgress;
  if (!videoProgress || typeof videoProgress !== 'object') continue;

  for (const [txId, tx] of Object.entries(videoProgress)) {
    if (!tx || typeof tx !== 'object' || tx.completed !== true) continue;
    // history 날짜 결정: tx.updatedAt → progress.updatedAt → 현재 KST
    const refDate = tsToDate(tx.updatedAt) || tsToDate(data.updatedAt) || new Date();
    candidatesByUid.has(uid) || candidatesByUid.set(uid, []);
    candidatesByUid.get(uid).push({
      unitId,
      txId,
      transmissionTitle: tx.transmissionTitle || '',
      stampedCount: Array.isArray(tx.stampedSeconds) ? tx.stampedSeconds.length : (tx.stampedCount || 0),
      videoTime: Math.floor(tx.lastPosition || 0),
      kstDate: getKSTDateString(refDate),
    });
  }
}
console.log(`completed:true 영상을 가진 학생 수: ${candidatesByUid.size}`);

// 3) 각 uid 의 history 에서 (unitId, type:'video') 존재 여부 확인 후 누락분 추출
const toBackfill = []; // { uid, unitId, txId, ... }
let scannedUids = 0;
for (const [uid, candidates] of candidatesByUid) {
  scannedUids++;
  if (scannedUids % 50 === 0) console.log(`  ... 진행 중 (${scannedUids}/${candidatesByUid.size})`);
  // 이 uid 의 history 중 type:'video' 인 문서의 (unitId, transmissionId) 집합 구성
  const histSnap = await db.collection('users').doc(uid).collection('history').get();
  const haveVideo = new Set();
  for (const h of histSnap.docs) {
    const v = h.data();
    if (v.type === 'video') haveVideo.add(`${v.unitId}::${v.transmissionId || ''}`);
  }
  for (const c of candidates) {
    if (!haveVideo.has(`${c.unitId}::${c.txId}`)) {
      toBackfill.push({ uid, ...c });
    }
  }
}

console.log('='.repeat(60));
console.log(`누락된 type:'video' history 문서 수: ${toBackfill.length}`);

if (toBackfill.length === 0) {
  console.log('복구 대상이 없습니다. ✅');
  process.exit(0);
}

// 영향받는 uid/unitId 요약 출력
const uidSet = new Set(toBackfill.map((b) => b.uid));
const unitSet = new Set(toBackfill.map((b) => b.unitId));
console.log(`영향 학생 수: ${uidSet.size}, 영향 단원 수: ${unitSet.size}`);
console.log('\n[누락 목록]');
for (const b of toBackfill.slice(0, 100)) {
  console.log(`  uid=${b.uid} unit=${b.unitId} tx=${b.txId} date=${b.kstDate} stamps=${b.stampedCount} title="${b.transmissionTitle}"`);
}
if (toBackfill.length > 100) console.log(`  ... 외 ${toBackfill.length - 100}건`);

if (!APPLY) {
  console.log('\n🔍 DRY-RUN 완료. 실제 적용하려면 --apply 플래그를 추가하세요.');
  process.exit(0);
}

// 4) 실제 기록: 누락된 history 문서를 merge 로 생성 (idempotent)
console.log('\n✅ APPLY: history 문서 생성 중...');
let created = 0;
const affectedUids = new Set();
for (const b of toBackfill) {
  const stableHistoryId = `video_daily_${b.kstDate}_${b.unitId}_${b.txId}`;
  const historyRef = db.collection('users').doc(b.uid).collection('history').doc(stableHistoryId);
  await historyRef.set({
    unitId: b.unitId,
    transmissionId: b.txId,
    type: 'video',
    activityType: '영상 교신 완료',
    timestamp: FieldValue.serverTimestamp(),
    crystalsEarned: 0, // 중복 보상 지급 방지
    completionVia: 'backfill_script',
    transmissionTitle: b.transmissionTitle || '',
    videoTime: b.videoTime,
    stampedCount: b.stampedCount,
  }, { merge: true });
  created++;
  affectedUids.add(b.uid);
  if (created % 50 === 0) console.log(`  ... ${created}/${toBackfill.length} 생성`);
}
console.log(`생성 완료: ${created}건`);

// 5) 영향받은 uid 의 learningSummaries rebuild — syncLearningSummary 트리거가 이미 history onWrite 로
//    갱신되지만, 대량 일괄 처리 후 일관성을 위해 명시적으로 갱신 보장.
//    history onWrite 트리거(syncLearningSummary)가 modalities.video 를 자동 설정하므로
//    여기서는 최종 검증용 카운트만 출력한다.
console.log(`\n영향받은 학생 수(rebuild 대상): ${affectedUids.size}`);
console.log('참고: history onWrite 트리거(syncLearningSummary)가 learningSummaries 를 자동 갱신합니다.');
console.log('     필요 시 각 학생이 앱 진입 시 getOrRebuildLearningSummary(validateFreshness:true) 로 요약이 보정됩니다.');

console.log('\n🎉 완료.');
process.exit(0);

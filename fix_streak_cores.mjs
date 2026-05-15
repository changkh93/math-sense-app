/**
 * 🔧 크라이오 코어 버그로 인한 스트릭 보정 스크립트
 * 
 * 사용법:
 *   node fix_streak_cores.mjs          # 감사만 (dry-run)
 *   node fix_streak_cores.mjs --fix    # 실제 보정 적용
 */

import admin from 'firebase-admin';
import { buildStreakWriteAudit, extractLearningActivityDates, getTodayKST, recalculateStreakState } from './src/utils/streakUtils.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serviceAccountPath = path.join(__dirname, 'service-account.json');

if (fs.existsSync(serviceAccountPath)) {
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} else {
  // Fallback to Application Default Credentials
  admin.initializeApp({
    projectId: 'math-sense-1f6a8',
  });
}

const db = admin.firestore();
const FIX_MODE = process.argv.includes('--fix');
const DANGEROUS_FIX_MODE = process.argv.includes('--dangerously-fix-streak-cores');

if (FIX_MODE && !DANGEROUS_FIX_MODE) {
  throw new Error('Bulk streak/core repair is disabled. Use audited per-user repair scripts instead.');
}

async function auditAndFix() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔧 크라이오 코어 스트릭 보정 스크립트`);
  console.log(`모드: ${FIX_MODE ? '🔴 실제 보정 (FIX)' : '🟢 감사만 (DRY-RUN)'}`);
  console.log(`${'='.repeat(60)}\n`);

  const todayKST = getTodayKST();
  console.log(`KST 오늘: ${todayKST}\n`);

  const usersSnap = await db.collection('users').get();
  console.log(`총 사용자: ${usersSnap.size}명\n`);

  const affectedUsers = [];

  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;
    const userData = userDoc.data();
    const displayName = userData.displayName || userData.name || uid.slice(0, 8);

    // 트랜잭션 가져오기
    const txSnap = await db.collection('users').doc(uid)
      .collection('crystal_transactions').orderBy('timestamp', 'asc').get();
    const transactions = txSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const corePurchaseDates = transactions
      .filter(t => t.type === 'store_purchase' && t.metadata?.itemId === 'cryo_core' && t.timestamp)
      .map(t => getTodayKST(t.timestamp.toDate ? t.timestamp.toDate() : new Date(t.timestamp)));
    const freezeUsageDates = transactions
      .filter(t => t.type === 'streak_freeze' && t.timestamp)
      .map(t => getTodayKST(t.timestamp.toDate ? t.timestamp.toDate() : new Date(t.timestamp)))
      .sort();
    const corePurchases = corePurchaseDates.length;
    const freezeEvents = freezeUsageDates.length;
    const currentFreezeCount = userData.streakFreezeCount || 0;

    if (corePurchases === 0 && currentFreezeCount === 0 && freezeEvents === 0) {
      console.log(`⏭️  ${displayName} — 코어 없음, 스킵`);
      continue;
    }

    const coreEvidenceDates = [...corePurchaseDates];

    const simulatedInventory = [...corePurchaseDates].sort();
    freezeUsageDates.forEach(usageDate => {
      const idx = simulatedInventory.findIndex(purchaseDate => purchaseDate <= usageDate);
      if (idx !== -1) simulatedInventory.splice(idx, 1);
      else coreEvidenceDates.push(usageDate);
    });

    const currentlyExpected = coreEvidenceDates.length - freezeUsageDates.length;
    if (currentFreezeCount > currentlyExpected) {
      for (let i = 0; i < currentFreezeCount - currentlyExpected; i++) {
        coreEvidenceDates.push(todayKST);
      }
    }

    const totalCoresEverHad = coreEvidenceDates.length;

    // 히스토리
    const histSnap = await db.collection('users').doc(uid)
      .collection('history').orderBy('timestamp', 'asc').get();

    const historyEntries = histSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const activeDates = extractLearningActivityDates(historyEntries, transactions);

    if (activeDates.size === 0) continue;

    const result = recalculateStreakState(Array.from(activeDates), coreEvidenceDates, todayKST);

    const dbStreak = userData.currentStreak || 0;
    const dbLongest = userData.longestStreak || 0;
    const dbLastDate = userData.lastStreakDate || '';
    const longestShouldBe = Math.max(dbLongest, result.correctStreak);
    const shouldFix =
      result.correctStreak !== dbStreak ||
      result.correctLastDate !== dbLastDate ||
      result.coresRemaining !== currentFreezeCount;

    if (shouldFix) {
      affectedUsers.push({
        uid, displayName,
        dbStreak, dbLongest, dbLastDate,
        correctStreak: result.correctStreak,
        correctLastDate: result.correctLastDate,
        correctLongest: longestShouldBe,
        coresUsed: result.coresUsed,
        defendedDates: result.defendedDates,
        totalCoresEverHad, currentFreezeCount,
        correctFreezeCount: result.coresRemaining,
      });

      console.log(`\n⚠️  ${displayName}`);
      console.log(`   DB 스트릭: ${dbStreak}일 → 올바른 스트릭: ${result.correctStreak}일`);
      console.log(`   DB 최장: ${dbLongest}일 → 올바른 최장: ${longestShouldBe}일`);
      console.log(`   마지막 학습일: ${dbLastDate} → ${result.correctLastDate}`);
      console.log(`   코어: ${totalCoresEverHad}개 / 사용: ${result.coresUsed}개 / 잔여: ${result.coresRemaining}개`);
      console.log(`   방어 날짜: [${result.defendedDates.join(', ')}]`);
    } else {
      console.log(`✅ ${displayName} — 정상 (스트릭: ${dbStreak}일)`);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 보정 필요: ${affectedUsers.length}명`);
  console.log(`${'='.repeat(60)}\n`);

  if (affectedUsers.length === 0) {
    console.log('🎉 보정이 필요한 사용자가 없습니다!');
    process.exit(0);
  }

  if (!FIX_MODE) {
    console.log('💡 실제 보정: node fix_streak_cores.mjs --fix\n');
    process.exit(0);
  }

  console.log('🔧 보정 적용 중 (Batched Writes)...\n');
  const batches = [];
  let currentBatch = db.batch();
  let currentBatchCount = 0;

  for (const user of affectedUsers) {
    try {
      const updates = {
        currentStreak: user.correctStreak,
        longestStreak: user.correctLongest,
        streakFreezeCount: user.correctFreezeCount,
        streakWriteAudit: buildStreakWriteAudit({
          source: 'cli_fix_streak_cores',
          writerUid: 'admin-script',
          prevState: {
            currentStreak: user.dbStreak,
            lastStreakDate: user.dbLastDate,
            streakFreezeCount: user.currentFreezeCount,
          },
          nextState: {
            currentStreak: user.correctStreak,
            lastStreakDate: user.correctLastDate,
            streakFreezeCount: user.correctFreezeCount,
          },
          writtenAt: admin.firestore.FieldValue.serverTimestamp(),
          note: user.uid,
        }),
      };
      updates.lastStreakDate = user.correctLastDate;
      
      const userRef = db.collection('users').doc(user.uid);
      currentBatch.set(userRef, updates, { merge: true });
      currentBatchCount++;

      if (currentBatchCount >= 400) {
        batches.push(currentBatch);
        currentBatch = db.batch();
        currentBatchCount = 0;
      }
      
      console.log(`✅ Queueing update for ${user.displayName}: ${user.dbStreak} → ${user.correctStreak}일`);
    } catch (err) {
      console.error(`❌ ${user.displayName}: 큐 추가 실패 —`, err.message);
    }
  }
  if (currentBatchCount > 0) batches.push(currentBatch);

  console.log(`\n총 ${batches.length}개의 배치를 커밋합니다...`);
  for (let i = 0; i < batches.length; i++) {
    await batches[i].commit();
    console.log(`✅ Batch ${i + 1}/${batches.length} 커밋 완료.`);
  }

  console.log('\n🎉 보정 완료!\n');
  process.exit(0);
}

auditAndFix().catch(err => {
  console.error('스크립트 오류:', err);
  process.exit(1);
});

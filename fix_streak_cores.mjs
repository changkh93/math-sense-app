/**
 * 🔧 크라이오 코어 버그로 인한 스트릭 보정 스크립트
 * 
 * 사용법:
 *   node fix_streak_cores.mjs          # 감사만 (dry-run)
 *   node fix_streak_cores.mjs --fix    # 실제 보정 적용
 */

import admin from 'firebase-admin';

admin.initializeApp({
  projectId: 'math-sense-1f6a8',
});

const db = admin.firestore();
const FIX_MODE = process.argv.includes('--fix');

function getTodayKST() {
  const kstNow = new Date(Date.now() + 9 * 3600000);
  return kstNow.toISOString().split('T')[0];
}

function daysBetween(d1, d2) {
  const a = new Date(d1 + 'T00:00:00+09:00');
  const b = new Date(d2 + 'T00:00:00+09:00');
  return Math.floor((b - a) / 86400000);
}

/**
 * 전체 활동 기록 + 코어 예산으로 올바른 스트릭 재계산
 */
function recalculateStreak(activeDates, totalCoresAvailable) {
  if (activeDates.length === 0) {
    return { correctStreak: 0, correctLastDate: '', coresUsed: 0, defendedDates: [] };
  }

  const sorted = [...activeDates].sort();
  let coresRemaining = totalCoresAvailable;
  const defendedDates = [];
  const allDates = new Set(sorted);

  // 갭 분석: 활동일 사이의 작은 갭을 코어로 방어
  for (let i = 0; i < sorted.length - 1 && coresRemaining > 0; i++) {
    const gap = daysBetween(sorted[i], sorted[i + 1]) - 1;
    if (gap > 0 && gap <= coresRemaining) {
      const scanObj = new Date(sorted[i] + 'T12:00:00Z');
      for (let j = 0; j < gap; j++) {
        scanObj.setUTCDate(scanObj.getUTCDate() + 1);
        const dStr = scanObj.toISOString().split('T')[0];
        defendedDates.push(dStr);
        allDates.add(dStr);
        coresRemaining--;
      }
    }
  }

  // 끝에서부터 역방향으로 가장 최근 연속 체인 길이 계산
  const allSorted = Array.from(allDates).sort();
  let streakCount = 1;
  for (let i = allSorted.length - 2; i >= 0; i--) {
    if (daysBetween(allSorted[i], allSorted[i + 1]) === 1) {
      streakCount++;
    } else {
      break;
    }
  }

  const lastDate = allSorted[allSorted.length - 1];
  return {
    correctStreak: streakCount,
    correctLastDate: lastDate,
    coresUsed: totalCoresAvailable - coresRemaining,
    coresRemaining,
    defendedDates,
  };
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

    const corePurchases = transactions.filter(t =>
      t.type === 'store_purchase' && t.metadata?.itemId === 'cryo_core'
    ).length;
    const freezeEvents = transactions.filter(t => t.type === 'streak_freeze').length;
    const currentFreezeCount = userData.streakFreezeCount || 0;

    if (corePurchases === 0 && currentFreezeCount === 0 && freezeEvents === 0) {
      console.log(`⏭️  ${displayName} — 코어 없음, 스킵`);
      continue;
    }

    const totalCoresEverHad = Math.max(corePurchases, freezeEvents + currentFreezeCount);

    // 히스토리
    const histSnap = await db.collection('users').doc(uid)
      .collection('history').orderBy('timestamp', 'asc').get();

    const activeDates = new Set();
    histSnap.docs.forEach(d => {
      const h = d.data();
      if (!h.timestamp) return;
      const ts = h.timestamp.toDate ? h.timestamp.toDate() : new Date(h.timestamp);
      const kst = new Date(ts.getTime() + 9 * 3600000);
      activeDates.add(kst.toISOString().split('T')[0]);
    });

    if (activeDates.size === 0) continue;

    const result = recalculateStreak(Array.from(activeDates), totalCoresEverHad);

    const dbStreak = userData.currentStreak || 0;
    const dbLongest = userData.longestStreak || 0;
    const dbLastDate = userData.lastStreakDate || '';
    const longestShouldBe = Math.max(dbLongest, result.correctStreak);
    const shouldFix = result.correctStreak > dbStreak;

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
      });

      console.log(`\n⚠️  ${displayName}`);
      console.log(`   DB 스트릭: ${dbStreak}일 → 올바른 스트릭: ${result.correctStreak}일`);
      console.log(`   DB 최장: ${dbLongest}일 → 올바른 최장: ${longestShouldBe}일`);
      console.log(`   마지막 학습일: ${dbLastDate} → ${result.correctLastDate}`);
      console.log(`   코어: ${totalCoresEverHad}개 / 사용: ${result.coresUsed}개`);
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

  console.log('🔧 보정 적용 중...\n');
  for (const user of affectedUsers) {
    try {
      const updates = {
        currentStreak: user.correctStreak,
        longestStreak: user.correctLongest,
      };
      if (!user.dbLastDate || user.correctLastDate > user.dbLastDate) {
        updates.lastStreakDate = user.correctLastDate;
      }
      await db.collection('users').doc(user.uid).set(updates, { merge: true });
      console.log(`✅ ${user.displayName}: ${user.dbStreak} → ${user.correctStreak}일`);
    } catch (err) {
      console.error(`❌ ${user.displayName}: 실패 —`, err.message);
    }
  }

  console.log('\n🎉 보정 완료!\n');
  process.exit(0);
}

auditAndFix().catch(err => {
  console.error('스크립트 오류:', err);
  process.exit(1);
});

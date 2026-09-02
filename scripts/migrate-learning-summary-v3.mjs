/**
 * migrate-learning-summary-v3.mjs
 *
 * Learning Summary Schema v3 Migration & Verification Script
 *
 * 불변식:
 * 1. 점수, daily 통계, stats, totalHistoryCount, crystals, streak는 절대 수정하거나 재계산하지 않는다.
 * 2. 기존 summary가 있는 사용자는 units 배열만 6개 모달리티(quiz, workbook, video, text, codeTrace, missionLab)로
 *    확장하고, learning_progress의 완료(logRead, videoCompleted, missionLabCompleted)를 단조 증가 OR 병합한다.
 * 3. summary가 아예 없는 사용자만 최초 1회 history + progress 기반으로 buildLearningSummaryFromScratch를 실행한다.
 * 4. Audit 모드는 실제 DB의 learningSummaries/{uid} 문서를 읽어 progress 완료가 100% 반영되어 있는지 검증한다.
 *
 * 사용법:
 *   node scripts/migrate-learning-summary-v3.mjs               # dry-run (기본)
 *   node scripts/migrate-learning-summary-v3.mjs --apply       # 실제 DB 이관 적용
 *   node scripts/migrate-learning-summary-v3.mjs --audit       # 실제 저장된 DB 데이터 정합성 감사
 *   node scripts/migrate-learning-summary-v3.mjs --uid <UID>   # 특정 사용자만 대상
 *   node scripts/migrate-learning-summary-v3.mjs --after <UID> --limit 50 # 마지막 CHECKPOINT 이후 재개
 */
import admin from 'firebase-admin';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  LEARNING_SUMMARY_SCHEMA_VERSION,
  buildLearningSummaryFromScratch,
  migrateExistingSummaryToV3,
  auditSummaryAgainstProgress,
} = require('../functions/learningSummaryDomain.cjs');

export function parseMigrationOptions(args = []) {
  const options = { apply: false, audit: false, uid: null, after: null, limit: null };
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (flag === '--apply') options.apply = true;
    else if (flag === '--audit') options.audit = true;
    else if (['--uid', '--after', '--limit'].includes(flag)) {
      const value = args[++i];
      if (!value || value.startsWith('--')) throw new Error(`${flag} requires a value`);
      if (flag === '--limit') {
        if (!/^\d+$/.test(value) || Number(value) < 1) throw new Error('Invalid --limit');
        options.limit = Number(value);
      } else {
        if (value.includes('/')) throw new Error(`Invalid ${flag}`);
        options[flag.slice(2)] = value;
      }
    } else throw new Error(`Unknown option: ${flag}`);
  }
  if (options.apply && options.audit) throw new Error('--audit cannot be combined with --apply');
  if (options.uid && (options.after || options.limit)) throw new Error('--uid cannot be combined with --after/--limit');
  return options;
}

// An active history trigger may update the summary after the dry-run read.
// Fail safely on a conflict instead of replacing newer stats/units. No extra
// read is required on the normal path; rerun the reported UID on conflict.
export async function applyMigrationTarget(summaryRef, summarySnap, targetSummary) {
  if (summarySnap.exists) {
    await summaryRef.update({
      schemaVersion: targetSummary.schemaVersion,
      units: targetSummary.units,
    }, { lastUpdateTime: summarySnap.updateTime });
  } else {
    await summaryRef.create({ ...targetSummary, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
  }
}

async function run() {
  const { apply: APPLY, audit: AUDIT_ONLY, uid: UID_FILTER, after, limit } = parseMigrationOptions(process.argv.slice(2));
  const serviceAccountPath = new URL('../service-account.json', import.meta.url);
  if (!existsSync(serviceAccountPath)) {
    console.error('Service account not found at', serviceAccountPath.pathname);
    process.exit(1);
  }
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  const db = admin.firestore();

  console.log(`\n=== Learning Summary Schema v3 Migration & Verification ===`);
  console.log(`Mode: ${AUDIT_ONLY ? '🔍 AUDIT (실제 DB 정합성 검사)' : (APPLY ? '🚀 APPLY (실제 DB 저장)' : '📝 DRY-RUN (시뮬레이션)')}`);
  console.log(`Target: ${UID_FILTER ? `User ${UID_FILTER}` : 'All Users'}\n`);

  let userIds = [];
  if (UID_FILTER) {
    userIds = [UID_FILTER];
  } else {
    let usersQuery = db.collection('users').orderBy(admin.firestore.FieldPath.documentId());
    if (after) usersQuery = usersQuery.startAfter(after);
    if (limit) usersQuery = usersQuery.limit(limit);
    const usersSnap = await usersQuery.select().get();
    userIds = usersSnap.docs.map((d) => d.id);
  }

  console.log(`Found ${userIds.length} users to inspect.\n`);

  let totalMigrated = 0;
  let totalMismatches = 0;
  let totalCheckedProgressDocs = 0;
  const mismatchDetails = [];

  for (const uid of userIds) {
    const summaryRef = db.collection('learningSummaries').doc(uid);
    console.log(`[CHECKING] uid=${uid}`);
    const [summarySnap, progressSnap] = await Promise.all([
      summaryRef.get(),
      db.collection('users').doc(uid).collection('learning_progress')
        .select('logRead', 'videoProgress', 'missionLab').get(),
    ]);

    const existingSummary = summarySnap.exists ? summarySnap.data() : null;

    if (AUDIT_ONLY) {
      totalCheckedProgressDocs += progressSnap.size;
      const issues = auditSummaryAgainstProgress(uid, existingSummary, progressSnap.docs);
      if (!existingSummary && issues.length === 0) {
        const historyProbe = await db.collection('users').doc(uid).collection('history').limit(1).select().get();
        if (!historyProbe.empty) issues.push(`User ${uid}: history exists but learningSummaries is missing`);
      }
      if (issues.length > 0) {
        totalMismatches += issues.length;
        mismatchDetails.push(...issues);
      }
      console.log(`[CHECKPOINT] ${uid}`);
      continue;
    }

    let targetSummary = null;
    if (existingSummary) {
      // Preserve daily, stats, totalHistoryCount exactly. Only upgrade units and OR-merge progress.
      targetSummary = migrateExistingSummaryToV3(existingSummary, progressSnap.docs);
    } else {
      // Summary does not exist: read history once to build from scratch
      const historySnap = await db.collection('users').doc(uid).collection('history').get();
      if (historySnap.empty && progressSnap.empty) {
        console.log(`[CHECKPOINT] ${uid}`);
        continue;
      }
      targetSummary = buildLearningSummaryFromScratch(historySnap.docs, progressSnap.docs);
    }

    totalCheckedProgressDocs += progressSnap.size;

    // Check if targetSummary introduces any changes
    const isAlreadyV3 = existingSummary && existingSummary.schemaVersion === LEARNING_SUMMARY_SCHEMA_VERSION;
    const unitsChanged = JSON.stringify(existingSummary?.units) !== JSON.stringify(targetSummary.units);
    const needsUpdate = !isAlreadyV3 || unitsChanged;

    if (needsUpdate) {
      totalMigrated++;
      if (APPLY) {
        await applyMigrationTarget(summaryRef, summarySnap, targetSummary);
        console.log(`[APPLIED] uid=${uid} (units: ${targetSummary.units.length}, schema: v3)`);
      } else {
        console.log(`[DRY-RUN] Would update uid=${uid} (units: ${targetSummary.units.length}, previousSchema: ${existingSummary?.schemaVersion || 'none'})`);
      }
    }
    console.log(`[CHECKPOINT] ${uid}`);
  }

  console.log('\n========================================');
  if (AUDIT_ONLY) {
    console.log(`Checked Progress Documents: ${totalCheckedProgressDocs}`);
    console.log(`Total Mismatches Found: ${totalMismatches}`);
    if (mismatchDetails.length > 0) {
      console.log('\nMismatch Details:');
      mismatchDetails.forEach((d) => console.log(' - ' + d));
    }
    console.log(`\nIntegrity Result: ${totalMismatches === 0 ? '✅ 100% MATCH (0 Mismatches in DB)' : '⚠️ MISMATCHES DETECTED'}`);
  } else {
    console.log(`Total Users Processed: ${userIds.length}`);
    console.log(`Users Requiring v3 Migration: ${totalMigrated}`);
    console.log(`Action: ${APPLY ? '✅ Migration Applied to DB' : '📝 Dry-Run Complete (No DB writes)'}`);
  }
  console.log('========================================\n');
  if (AUDIT_ONLY && totalMismatches > 0) process.exitCode = 2;
  await db.terminate();
}

if (process.argv[1]?.endsWith('migrate-learning-summary-v3.mjs')) {
  run().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}

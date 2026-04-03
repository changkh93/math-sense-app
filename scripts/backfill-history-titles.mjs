/**
 * One-time Migration Script: Backfill unitTitle in history documents
 * 
 * This script finds all history documents missing a proper unitTitle
 * and resolves the title from the `units` collection (or `assignments` as fallback).
 * 
 * Usage:
 *   node scripts/backfill-history-titles.mjs
 * 
 * Prerequisites:
 *   npm install firebase-admin
 *   Set GOOGLE_APPLICATION_CREDENTIALS env var to your service account key path
 *   OR place the key at ./serviceAccountKey.json
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';

// ── Initialize Firebase Admin ──
let credential;
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  credential = cert(process.env.GOOGLE_APPLICATION_CREDENTIALS);
} else if (existsSync('./serviceAccountKey.json')) {
  const serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'));
  credential = cert(serviceAccount);
} else {
  console.error('❌ No service account found. Set GOOGLE_APPLICATION_CREDENTIALS or place serviceAccountKey.json in CWD.');
  process.exit(1);
}

initializeApp({ credential });
const db = getFirestore();

// ── Helpers ──
function looksLikeId(str) {
  if (!str || str.length === 0) return true;
  // Common ID patterns
  if (/^(unit|reg|chap|prob|cluster)_\d/.test(str)) return true;
  if (/\w+_\w+_chap\d+/.test(str)) return true;
  if (/^\w+_\d{10,}/.test(str)) return true;
  if (/^[a-f0-9]{24,}$/.test(str)) return true;
  // All-ASCII with underscores and no Korean
  if (/^[a-zA-Z0-9_]+$/.test(str) && str.includes('_') && !/[\uAC00-\uD7AF]/.test(str)) return true;
  return false;
}

async function main() {
  console.log('🚀 Starting history title backfill migration...\n');

  // 1. Build a units title map
  console.log('📚 Loading units collection...');
  const unitsSnap = await db.collection('units').get();
  const unitTitleMap = new Map();
  unitsSnap.forEach(doc => {
    const data = doc.data();
    const title = data.title || data.name || '';
    if (title) unitTitleMap.set(doc.id, title);
  });
  console.log(`   Found ${unitTitleMap.size} units with titles.\n`);

  // 2. Build assignments fallback map (unitId → unitTitle)
  console.log('📋 Loading assignments collection for fallback titles...');
  const assignmentsSnap = await db.collection('assignments').get();
  const assignmentTitleMap = new Map();
  assignmentsSnap.forEach(doc => {
    const data = doc.data();
    const unitId = data.unitId;
    const title = data.unitTitle || data.title || '';
    if (unitId && title && !assignmentTitleMap.has(unitId)) {
      assignmentTitleMap.set(unitId, title);
    }
  });
  console.log(`   Found ${assignmentTitleMap.size} assignment-based titles.\n`);

  // 3. Scan all users and their history subcollections
  console.log('👥 Loading users...');
  const usersSnap = await db.collection('users').get();
  console.log(`   Found ${usersSnap.size} users.\n`);

  let totalScanned = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalNotFound = 0;

  for (const userDoc of usersSnap.docs) {
    const userId = userDoc.id;
    const userData = userDoc.data();
    if (userData.role === 'admin' || userData.role === 'parent') continue;

    const historySnap = await db.collection('users').doc(userId).collection('history').get();
    
    const batch = db.batch();
    let batchCount = 0;

    for (const histDoc of historySnap.docs) {
      totalScanned++;
      const data = histDoc.data();
      const currentTitle = data.unitTitle || '';
      const unitId = data.unitId || '';

      // Check if title needs fixing
      if (currentTitle && !looksLikeId(currentTitle)) {
        totalSkipped++;
        continue; // Already has a good title
      }

      // Try to resolve the title
      let resolvedTitle = unitTitleMap.get(unitId) || assignmentTitleMap.get(unitId) || '';

      if (!resolvedTitle) {
        totalNotFound++;
        continue; // Can't resolve — formatUnitId fallback will handle at runtime
      }

      // Update the document
      batch.update(histDoc.ref, { unitTitle: resolvedTitle });
      batchCount++;
      totalUpdated++;

      // Firestore batches support max 500 operations
      if (batchCount >= 450) {
        await batch.commit();
        console.log(`   ✅ Committed batch of ${batchCount} updates for user ${userData.name || userId}`);
        batchCount = 0;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    if (historySnap.size > 0) {
      const updated = historySnap.docs.filter(d => {
        const t = d.data().unitTitle || '';
        return !t || looksLikeId(t);
      }).length;
      if (updated > 0) {
        console.log(`   👤 ${userData.name || userId}: ${historySnap.size} records scanned, titles updated`);
      }
    }
  }

  // 4. Also backfill learning_progress unitTitle
  console.log('\n📊 Backfilling learning_progress unitTitles...');
  let lpUpdated = 0;

  for (const userDoc of usersSnap.docs) {
    const userId = userDoc.id;
    const userData = userDoc.data();
    if (userData.role === 'admin' || userData.role === 'parent') continue;

    const lpSnap = await db.collection('users').doc(userId).collection('learning_progress').get();
    const batch = db.batch();
    let batchCount = 0;

    for (const lpDoc of lpSnap.docs) {
      const data = lpDoc.data();
      const currentTitle = data.unitTitle || '';
      const unitId = lpDoc.id;

      if (currentTitle && !looksLikeId(currentTitle)) continue;

      const resolvedTitle = unitTitleMap.get(unitId) || assignmentTitleMap.get(unitId) || '';
      if (!resolvedTitle) continue;

      batch.update(lpDoc.ref, { unitTitle: resolvedTitle });
      batchCount++;
      lpUpdated++;

      if (batchCount >= 450) {
        await batch.commit();
        batchCount = 0;
      }
    }

    if (batchCount > 0) await batch.commit();
  }

  console.log(`\n════════════════════════════════════════`);
  console.log(`✅ Migration Complete!`);
  console.log(`   History records scanned: ${totalScanned}`);
  console.log(`   Already OK (skipped):    ${totalSkipped}`);
  console.log(`   Titles updated:          ${totalUpdated}`);
  console.log(`   Title not found:         ${totalNotFound}`);
  console.log(`   LP docs updated:         ${lpUpdated}`);
  console.log(`════════════════════════════════════════\n`);
}

main().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});

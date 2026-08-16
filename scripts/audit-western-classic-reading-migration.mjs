#!/usr/bin/env node

/**
 * Migration Audit Script for Western Classic Reading Assignments
 * Read-only script to inspect legacy vs migrated assignments.
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

let db;

function initFirebase() {
  if (getApps().length > 0) {
    db = getFirestore();
    return;
  }

  const configuredCredentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
    ? resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS)
    : null;
  const localCredentialCandidates = [
    configuredCredentialPath,
    resolve(process.cwd(), 'service-account.json'),
    resolve(process.cwd(), 'serviceAccountKey.json'),
  ].filter(Boolean);
  const serviceAccountPath = localCredentialCandidates.find((candidate) => existsSync(candidate));
  if (serviceAccountPath) {
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
    initializeApp({
      credential: cert(serviceAccount)
    });
  } else {
    // Default application credentials / emulator
    initializeApp({
      projectId: 'math-sense-1f6a8'
    });
  }
  db = getFirestore();
}

async function auditWesternClassicAssignments() {
  console.log('=== Western Classic Reading Assignments Audit (Read-Only) ===\n');

  try {
    initFirebase();
  } catch (err) {
    console.error('Failed to initialize Firebase Admin:', err.message);
    console.log('To run this audit against live Firestore, provide serviceAccountKey.json or GOOGLE_APPLICATION_CREDENTIALS.');
    process.exitCode = 1;
    return;
  }

  try {
    const classicClusters = ['western-classic', '서양고전', '서양고전읽기', 'classic', 'classics'];
    const snap = await db.collection('assignments').where('clusterId', 'in', classicClusters).get();
    const allAssignments = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const classicAssignments = allAssignments.filter(a => classicClusters.includes(a.clusterId));

    const total = classicAssignments.length;
    const migrated = [];
    const legacyWithoutReading = [];
    const invalidSchema = [];

    classicAssignments.forEach((doc) => {
      if (doc.reading && doc.reading.bookId && Number.isFinite(Number(doc.reading.page))) {
        migrated.push(doc);
      } else if (!doc.reading) {
        legacyWithoutReading.push(doc);
      } else {
        invalidSchema.push(doc);
      }
    });

    console.log(`Total Western Classic Assignments Found: ${total}`);
    console.log(`- Valid Migrated (with reading metadata): ${migrated.length}`);
    console.log(`- Legacy (without reading metadata): ${legacyWithoutReading.length}`);
    console.log(`- Invalid Schema: ${invalidSchema.length}\n`);

    if (legacyWithoutReading.length > 0) {
      console.log('Sample Legacy Assignments:');
      legacyWithoutReading.slice(0, 10).forEach((item) => {
        console.log(`  - [${item.id}] User: ${item.userId}, Date: ${item.date}, Status: ${item.status}`);
      });
      if (legacyWithoutReading.length > 10) {
        console.log(`  ... and ${legacyWithoutReading.length - 10} more`);
      }
      console.log('\nNote: Legacy assignments are safely preserved and displayed with [책 정보 없음 · 기존 기록] badge.');
    }

    console.log('\nAudit complete.');
  } catch (err) {
    console.error('Audit failed:', err);
    process.exitCode = 1;
  }
}

auditWesternClassicAssignments().catch((err) => {
  console.error('Audit failed unexpectedly:', err);
  process.exitCode = 1;
});

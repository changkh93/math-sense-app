import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { generateStellarLeaderboardData } = require('../functions/stellarLeaderboardService.cjs');
const users = [
  { id: 'uploaded', profileImageUrl: 'https://example.invalid/upload.jpg', photoURL: 'https://example.invalid/google.jpg' },
  { id: 'empty' },
  { id: 'unsafe', profileImageUrl: 'javascript:alert(1)' },
];
const db = { collection(name) {
  return {
    where() { return this; }, orderBy() { return this; }, limit() { return this; },
    async get() { return { docs: name === 'users' ? users.map(u => ({ id: u.id, data: () => u })) : [] }; },
  };
} };
const payload = await generateStellarLeaderboardData(db);
const lists = Object.values(payload).filter(value => Array.isArray(value) && value.some(item => item.id === 'uploaded'));
assert.ok(lists.length >= 1);
for (const list of lists) {
  assert.equal(list.find(u => u.id === 'uploaded').profileImageUrl, users[0].profileImageUrl);
  assert.equal(list.find(u => u.id === 'empty').profileImageUrl, '');
  assert.equal(list.find(u => u.id === 'unsafe').profileImageUrl, '');
}
console.log('PASS leaderboard aggregates retain uploaded photos and explicit empty image fields');

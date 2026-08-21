import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 1. Load server storeGiftPolicy
const storeGiftPolicyPath = path.join(rootDir, 'functions/storeGiftPolicy.cjs');
const { STORE_ITEM_GIFT_CATALOG } = await import(storeGiftPolicyPath);

// 2. Load PublicProfile to check image mappings and actual assets
const publicProfilePath = path.join(rootDir, 'src/pages/Community/PublicProfile.jsx');
const publicProfileContent = fs.readFileSync(publicProfilePath, 'utf8');

console.log('🔍 Validating Base Themes & Store Catalog consistency...');

// Import BASE_THEMES and SOCIAL_STORE_ITEMS via dynamic import of socialUtils
const { BASE_THEMES, SOCIAL_STORE_ITEMS } = await import('../src/utils/socialUtils.js');

// Validation 1: BASE_THEMES integrity
assert(Array.isArray(BASE_THEMES), 'BASE_THEMES must be an array');
assert(BASE_THEMES.length >= 10, `BASE_THEMES should have at least 10 themes, found ${BASE_THEMES.length}`);

const themeIds = new Set();
const sortOrders = new Set();
let defaultThemeCount = 0;

for (const theme of BASE_THEMES) {
  assert(theme.id, 'Theme must have an id');
  assert(!themeIds.has(theme.id), `Duplicate theme id found: ${theme.id}`);
  themeIds.add(theme.id);

  assert(theme.name, `Theme ${theme.id} must have a name`);
  assert(theme.icon, `Theme ${theme.id} must have an icon`);
  assert(theme.accent && theme.accent.startsWith('#'), `Theme ${theme.id} must have a hex accent color`);
  assert(theme.pageBackground, `Theme ${theme.id} must have pageBackground CSS`);
  assert(theme.surface, `Theme ${theme.id} must have surface CSS`);
  assert(theme.description, `Theme ${theme.id} must have a description`);

  if (theme.id === 'orbital') {
    defaultThemeCount += 1;
  } else {
    assert(Number.isInteger(theme.sortOrder), `Paid theme ${theme.id} must have an integer sortOrder`);
    assert(!sortOrders.has(theme.sortOrder), `Duplicate theme sortOrder found: ${theme.sortOrder}`);
    sortOrders.add(theme.sortOrder);
  }

  if (theme.releasedAt) {
    assert(/^\d{4}-\d{2}-\d{2}$/.test(theme.releasedAt), `Theme ${theme.id} releasedAt must be YYYY-MM-DD`);
  }
  if (theme.newUntil) {
    assert(theme.releasedAt, `Theme ${theme.id} with newUntil must also have releasedAt`);
    assert(/^\d{4}-\d{2}-\d{2}$/.test(theme.newUntil), `Theme ${theme.id} newUntil must be YYYY-MM-DD`);
    assert(theme.releasedAt <= theme.newUntil, `Theme ${theme.id} newUntil must not precede releasedAt`);
  }
}

assert.equal(defaultThemeCount, 1, 'There must be exactly one default theme (orbital)');
console.log(`✔ BASE_THEMES verified (${BASE_THEMES.length} themes, 1 default)`);

// Validation 2: SOCIAL_STORE_ITEMS base items vs BASE_THEMES
const baseStoreItems = SOCIAL_STORE_ITEMS.filter(item => item.type === 'base');
const paidThemes = BASE_THEMES.filter(theme => theme.id !== 'orbital');

assert.equal(
  baseStoreItems.length,
  paidThemes.length,
  `Number of base store items (${baseStoreItems.length}) must match paid themes (${paidThemes.length})`
);

for (const theme of paidThemes) {
  const storeItem = baseStoreItems.find(item => item.themeId === theme.id);
  assert(storeItem, `Missing store item in SOCIAL_STORE_ITEMS for theme: ${theme.id}`);
  assert.equal(storeItem.id, `base_${theme.id}`, `Store item ID for ${theme.id} must be base_${theme.id}`);
  assert.equal(storeItem.name, theme.name, `Theme/store name mismatch for ${theme.id}`);
  assert(Number.isInteger(storeItem.cost) && storeItem.cost > 0, `Store item ${storeItem.id} cost must be positive integer`);
  assert(storeItem.name, `Store item ${storeItem.id} must have a name`);
}
console.log(`✔ SOCIAL_STORE_ITEMS verified (${baseStoreItems.length} base items matched to paid themes)`);

// Validation 3: Server STORE_ITEM_GIFT_CATALOG consistency with client store items
for (const storeItem of baseStoreItems) {
  const serverItem = STORE_ITEM_GIFT_CATALOG[storeItem.id];
  assert(serverItem, `Missing server catalog entry in STORE_ITEM_GIFT_CATALOG for ${storeItem.id}`);
  assert.equal(
    serverItem.cost,
    storeItem.cost,
    `Price mismatch for ${storeItem.id}: Client has ${storeItem.cost}, Server has ${serverItem.cost}`
  );
  assert.equal(
    serverItem.baseThemeId,
    storeItem.themeId,
    `baseThemeId mismatch for ${storeItem.id}: Client has ${storeItem.themeId}, Server has ${serverItem.baseThemeId}`
  );
  assert.equal(
    serverItem.ownedMode,
    'purchase_only',
    `Theme item ${storeItem.id} in server catalog must have ownedMode="purchase_only"`
  );
  assert.equal(serverItem.name, storeItem.name, `Client/server name mismatch for ${storeItem.id}`);
}
const serverBaseItems = Object.entries(STORE_ITEM_GIFT_CATALOG)
  .filter(([, item]) => Boolean(item.baseThemeId));
assert.equal(
  serverBaseItems.length,
  baseStoreItems.length,
  `Server base item count (${serverBaseItems.length}) must match client count (${baseStoreItems.length})`
);
console.log(`✔ Server STORE_ITEM_GIFT_CATALOG verified (all ${baseStoreItems.length} base items match 1:1 in price & ID)`);

// Validation 4: PublicProfile theme image mapping & asset existence
const importedAssets = new Map();
for (const match of publicProfileContent.matchAll(
  /import\s+(\w+)\s+from\s+['"]([^'"]+\.(?:jpe?g|png|webp|svg))['"]/gi
)) {
  importedAssets.set(match[1], match[2]);
}

const imageMapBlock = publicProfileContent.match(
  /const\s+BASE_THEME_IMAGES\s*=\s*\{([\s\S]*?)\};/
);
assert(imageMapBlock, 'PublicProfile.jsx must define BASE_THEME_IMAGES');

const mappedAssets = new Map();
for (const match of imageMapBlock[1].matchAll(/(\w+)\s*:\s*(\w+)\s*,?/g)) {
  mappedAssets.set(match[1], match[2]);
}

for (const theme of paidThemes) {
  const importName = mappedAssets.get(theme.id);
  assert(importName, `PublicProfile.jsx must map theme ${theme.id} in BASE_THEME_IMAGES`);
  const relativeAssetPath = importedAssets.get(importName);
  assert(relativeAssetPath, `Image variable ${importName} for ${theme.id} must be imported`);
  const assetPath = path.resolve(path.dirname(publicProfilePath), relativeAssetPath);
  assert(fs.existsSync(assetPath), `Missing image asset for ${theme.id}: ${assetPath}`);
  assert(fs.statSync(assetPath).size > 0, `Image asset for ${theme.id} must not be empty`);
}
assert.equal(mappedAssets.size, paidThemes.length, 'BASE_THEME_IMAGES must not contain orphan theme mappings');
console.log('✔ PublicProfile.jsx theme mappings and image assets verified');

console.log('\n🎉 ALL CATALOG VALIDATION CHECKS PASSED!\n');

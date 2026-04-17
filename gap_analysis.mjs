import fs from 'fs';

const inventoryPath = './region_quizzes_inventory.json';
const batchesDir = './scratch/recovery_batches/';

// 1. Get all IDs from the inventory for the target region
const inventoryRaw = fs.readFileSync(inventoryPath, 'utf8');
const inventoryBlocks = JSON.parse(inventoryRaw);
const targetRegionId = 'reg_1773407437227';

const allRequiredIds = inventoryBlocks
  .filter(block => block.id === targetRegionId)
  .flatMap(block => block.quizzes.map(q => q.id));

console.log(`Total IDs required in inventory: ${allRequiredIds.length}`);

// 2. Get all IDs from the generated batches
const batchFiles = fs.readdirSync(batchesDir).filter(f => f.endsWith('.json'));
const generatedIds = new Set();
const duplicateIds = [];

batchFiles.forEach(file => {
  const content = JSON.parse(fs.readFileSync(batchesDir + file, 'utf8'));
  content.forEach(item => {
    if (generatedIds.has(item.docId)) {
      duplicateIds.push(item.docId);
    }
    generatedIds.add(item.docId);
  });
});

console.log(`Total unique IDs generated: ${generatedIds.size}`);
console.log(`Duplicates found: ${duplicateIds.length}`);

// 3. Find missing IDs
const missingIds = allRequiredIds.filter(id => !generatedIds.has(id));
console.log(`Missing IDs count: ${missingIds.length}`);

// 4. Group missing IDs by unit
const missingByUnit = {};
missingIds.forEach(id => {
  // Extract unitId from id (usually it's a prefix)
  const parts = id.split('_q');
  const unitId = parts[0];
  if (!missingByUnit[unitId]) missingByUnit[unitId] = [];
  missingByUnit[unitId].push(id);
});

Object.keys(missingByUnit).forEach(unit => {
  console.log(`Unit ${unit}: ${missingByUnit[unit].length} missing`);
});

// Output missing IDs to a file for reference
fs.writeFileSync('./scratch/missing_recovery_ids.json', JSON.stringify(missingIds, null, 2));

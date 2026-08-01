const assert = require('node:assert/strict');

const {
  buildAstraBuilderAccess,
  getAstraBuilderBlockCapacity,
  getAstraBuilderGridByteLength,
  getAstraBuilderPlotDefinition,
  getAstraBuilderStoredGridBuffer,
  normalizeAstraBuilderBase64,
  planAstraBuilderPurchase,
  planAstraBuilderInstallation,
  validateAstraBuilderStatePayload,
} = require('./galaxyGame').__test;

const PLOT_ID = 'habitat-b01';
const BYTE_LENGTH = 12 * 10 * 12 * 2;

function payloadFromBuffer(gridBuffer, overrides = {}) {
  return {
    plotId: PLOT_ID,
    encoding: 'u16le-v1',
    gridDataBase64: gridBuffer.toString('base64'),
    modules: [],
    ...overrides,
  };
}

function testValidState() {
  assert.equal(getAstraBuilderGridByteLength({
    dimensions: { x: 12, y: 10, z: 12 },
  }), BYTE_LENGTH);

  const grid = Buffer.alloc(BYTE_LENGTH);
  grid.writeUInt16LE(1 | (3 << 8), 0);
  grid.writeUInt16LE(6, 2);
  grid.writeUInt16LE(7 | (1 << 8), 4);
  grid.writeUInt16LE(8, 6);
  const result = validateAstraBuilderStatePayload(payloadFromBuffer(grid, { blockCount: 4 }));
  assert.equal(result.kind, 'valid');
  assert.equal(result.blockCount, 4);
  assert.equal(result.gridBuffer.equals(grid), true);
  assert.deepEqual(result.modules, []);
}

function testMalformedPayloads() {
  const grid = Buffer.alloc(BYTE_LENGTH);
  assert.equal(validateAstraBuilderStatePayload(payloadFromBuffer(grid, {
    plotId: 'unknown',
  })).kind, 'invalid_plot');
  assert.equal(validateAstraBuilderStatePayload(payloadFromBuffer(grid, {
    encoding: 'json-v1',
  })).kind, 'invalid_encoding');
  assert.equal(validateAstraBuilderStatePayload(payloadFromBuffer(grid, {
    gridDataBase64: 'not base64',
  })).kind, 'invalid_base64');
  assert.equal(validateAstraBuilderStatePayload(payloadFromBuffer(Buffer.alloc(2))).kind, 'invalid_byte_length');
  assert.equal(validateAstraBuilderStatePayload(payloadFromBuffer(grid, {
    modules: [{ id: 'future-module' }],
  })).kind, 'unsupported_modules');
  assert.equal(validateAstraBuilderStatePayload(payloadFromBuffer(grid, {
    blockCount: 1,
  })).kind, 'block_count_mismatch');
}

function testCellValidation() {
  const invalidType = Buffer.alloc(BYTE_LENGTH);
  invalidType.writeUInt16LE(9, 0);
  assert.equal(validateAstraBuilderStatePayload(payloadFromBuffer(invalidType)).kind, 'invalid_block_type');

  const invalidBits = Buffer.alloc(BYTE_LENGTH);
  invalidBits.writeUInt16LE(0x800, 0);
  assert.equal(validateAstraBuilderStatePayload(payloadFromBuffer(invalidBits)).kind, 'invalid_cell_bits');

  const invalidEmpty = Buffer.alloc(BYTE_LENGTH);
  invalidEmpty.writeUInt16LE(1 << 8, 0);
  assert.equal(validateAstraBuilderStatePayload(payloadFromBuffer(invalidEmpty)).kind, 'invalid_empty_cell');

  const invalidUnderlay = Buffer.alloc(BYTE_LENGTH);
  invalidUnderlay.writeUInt16LE(2 | 0x400, 0);
  assert.equal(validateAstraBuilderStatePayload(payloadFromBuffer(invalidUnderlay)).kind, 'invalid_foundation_underlay');

  const fullGrid = Buffer.alloc(BYTE_LENGTH);
  for (let index = 0; index < BYTE_LENGTH / 2; index += 1) {
    fullGrid.writeUInt16LE(1 | 0x400, index * 2);
  }
  const fullGridResult = validateAstraBuilderStatePayload(payloadFromBuffer(fullGrid, {
    blockCount: (BYTE_LENGTH / 2) * 2,
  }));
  assert.equal(fullGridResult.kind, 'valid');
  assert.equal(fullGridResult.blockCount, 2880);
}

function testStoredByteNormalization() {
  const grid = Buffer.alloc(BYTE_LENGTH, 3);
  assert.equal(normalizeAstraBuilderBase64(grid.toString('base64')).equals(grid), true);
  assert.equal(normalizeAstraBuilderBase64('AQ==extra'), null);
  assert.equal(getAstraBuilderStoredGridBuffer(grid).equals(grid), true);
  assert.equal(getAstraBuilderStoredGridBuffer(new Uint8Array(grid)).equals(grid), true);
  assert.equal(getAstraBuilderStoredGridBuffer({
    toUint8Array: () => new Uint8Array(grid),
  }).equals(grid), true);
  assert.equal(getAstraBuilderStoredGridBuffer({}), null);
}

function testBuilderEntitlements() {
  const defaults = buildAstraBuilderAccess({}, 4200);
  assert.equal(defaults.wallet, 4200);
  assert.equal(defaults.slotCount, 1);
  assert.equal(defaults.plots.length, 1);
  assert.equal(defaults.plots[0].plotId, 'habitat-b01');
  assert.equal(defaults.plots[0].blockCapacity, 500);
  assert.equal(defaults.blockPackCost, 1000);
  assert.equal(defaults.slotCost, 2000);

  const expanded = buildAstraBuilderAccess({
    astraBuilderSlots: 3,
    astraBuilderPlacements: {
      'habitat-b02': [6, 6],
      'habitat-b03': [-6, 7],
    },
    astraBuilderBlockPacks: {
      'habitat-b01': 2,
      'habitat-b02': 9,
    },
  }, 100);
  assert.equal(expanded.plots.length, 3);
  assert.equal(expanded.plots[0].blockCapacity, 1500);
  assert.equal(expanded.plots[1].blockCapacity, 2500);
  assert.equal(getAstraBuilderBlockCapacity({}, 'habitat-b01'), 500);
  assert.equal(getAstraBuilderBlockCapacity({
    astraBuilderLegacyCapacities: { 'habitat-b01': 2714 },
  }, 'habitat-b01'), 2714);
  assert.equal(getAstraBuilderPlotDefinition('habitat-b08').name, '별빛 건축실 B-08');
  assert.equal(getAstraBuilderPlotDefinition('habitat-b09'), null);
}

function testBuilderPurchases() {
  const blockPack = planAstraBuilderPurchase({
    planet: {},
    wallet: 1500,
    kind: 'block_pack',
    plotId: 'habitat-b01',
  });
  assert.equal(blockPack.kind, 'purchasable');
  assert.equal(blockPack.cost, 1000);
  assert.equal(blockPack.nextWallet, 500);
  assert.equal(getAstraBuilderBlockCapacity(blockPack.nextPlanet, 'habitat-b01'), 1000);

  assert.equal(planAstraBuilderPurchase({ planet: {}, wallet: 999, kind: 'block_pack', plotId: 'habitat-b01' }).kind, 'insufficient_wallet');
  assert.equal(planAstraBuilderPurchase({ planet: {}, wallet: 5000, kind: 'block_pack', plotId: 'habitat-b02' }).kind, 'plot_unavailable');
  assert.equal(planAstraBuilderPurchase({ planet: { astraBuilderBlockPacks: { 'habitat-b01': 4 } }, wallet: 5000, kind: 'block_pack', plotId: 'habitat-b01' }).kind, 'max_capacity');
  assert.equal(planAstraBuilderPurchase({ planet: {}, wallet: 5000, kind: 'builder_slot' }).kind, 'invalid_kind');
}

function testBuilderInstallation() {
  const install = planAstraBuilderInstallation({ planet: {}, wallet: 2500, x: 65, y: 65 });
  assert.equal(install.kind, 'installable');
  assert.equal(install.cost, 2000);
  assert.equal(install.nextWallet, 500);
  assert.equal(install.plotId, 'habitat-b02');
  assert.deepEqual(install.center, [5, 5]);
  assert.deepEqual(install.nextPlanet.astraBuilderPlacements['habitat-b02'], [5, 5]);
  assert.equal(planAstraBuilderInstallation({ planet: {}, wallet: 1999, x: 65, y: 65 }).kind, 'insufficient_wallet');
  assert.equal(planAstraBuilderInstallation({ planet: { astraBuilderSlots: 8 }, wallet: 5000, x: 65, y: 65 }).kind, 'max_slots');
  assert.equal(planAstraBuilderInstallation({ planet: {}, wallet: 5000, x: 27.5, y: 50 }).kind, 'builder_overlap');
  assert.equal(planAstraBuilderInstallation({
    planet: { layout: [{ x: 56, y: 65 }] },
    wallet: 5000,
    x: 65,
    y: 65,
  }).kind, 'facility_overlap');
}

testValidState();
testMalformedPayloads();
testCellValidation();
testStoredByteNormalization();
testBuilderEntitlements();
testBuilderPurchases();
testBuilderInstallation();

console.log('Galaxy Astra Builder server tests passed.');

const assert = require('node:assert/strict');

const {
  getAstraBuilderGridByteLength,
  getAstraBuilderStoredGridBuffer,
  normalizeAstraBuilderBase64,
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
  const result = validateAstraBuilderStatePayload(payloadFromBuffer(grid, { blockCount: 2 }));
  assert.equal(result.kind, 'valid');
  assert.equal(result.blockCount, 2);
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
  invalidType.writeUInt16LE(7, 0);
  assert.equal(validateAstraBuilderStatePayload(payloadFromBuffer(invalidType)).kind, 'invalid_block_type');

  const invalidBits = Buffer.alloc(BYTE_LENGTH);
  invalidBits.writeUInt16LE(0x400, 0);
  assert.equal(validateAstraBuilderStatePayload(payloadFromBuffer(invalidBits)).kind, 'invalid_cell_bits');

  const invalidEmpty = Buffer.alloc(BYTE_LENGTH);
  invalidEmpty.writeUInt16LE(1 << 8, 0);
  assert.equal(validateAstraBuilderStatePayload(payloadFromBuffer(invalidEmpty)).kind, 'invalid_empty_cell');

  const tooMany = Buffer.alloc(BYTE_LENGTH);
  for (let index = 0; index < 361; index += 1) tooMany.writeUInt16LE(1, index * 2);
  assert.equal(validateAstraBuilderStatePayload(payloadFromBuffer(tooMany)).kind, 'too_many_blocks');
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

testValidState();
testMalformedPayloads();
testCellValidation();
testStoredByteNormalization();

console.log('Galaxy Astra Builder server tests passed.');

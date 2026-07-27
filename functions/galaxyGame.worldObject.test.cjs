const assert = require('node:assert/strict');

const {
  GALAXY_ITEM_CATALOG,
  getGalaxyItemDefaultDescription,
  getGalaxyLayoutWorldPosition,
  getGalaxyStructureVisitAction,
  isGalaxyObjectImagePath,
  planGalaxyItemPlacement,
  planGalaxyStructureVisit,
  validateGalaxyObjectImage,
} = require('./galaxyGame').__test;

const UID = 'student_world_1';
const INSTANCE_ID = 'star_lamp_object_1';
const IMAGE_PATH = `galaxy-objects/${UID}/${INSTANCE_ID}/frontier-photo.webp`;
const IMAGE_URL = `https://firebasestorage.googleapis.com/v0/b/math-sense-1f6a8.firebasestorage.app/o/${encodeURIComponent(IMAGE_PATH)}?alt=media&token=test-token`;

function testPlacementValidationAndSelfExclusion() {
  const layout = [
    { instanceId: 'self', x: 50, y: 50 },
    { instanceId: 'neighbor', x: 65, y: 50 },
  ];

  assert.deepEqual(planGalaxyItemPlacement({
    layout,
    instanceId: 'self',
    x: 50,
    y: 50,
    rotation: 91,
  }), {
    kind: 'valid',
    x: 50,
    y: 50,
    rotation: 90,
    worldX: 0,
    worldZ: 0,
  });

  assert.equal(planGalaxyItemPlacement({ layout, x: 64, y: 50 }).kind, 'overlap');
  assert.equal(planGalaxyItemPlacement({ layout: [], x: 92.6, y: 92.6 }).kind, 'outside_radius');
  assert.equal(planGalaxyItemPlacement({ layout: [], x: 93, y: 50 }).kind, 'outside_bounds');
  assert.equal(planGalaxyItemPlacement({ layout: [], x: 'not-a-number', y: 50 }).kind, 'invalid_number');

  const reservedX = 50 + 9.2 * 3;
  const reservedY = 50 + 7.8 * 3;
  assert.equal(planGalaxyItemPlacement({ layout: [], x: reservedX, y: reservedY }).kind, 'reserved');
}

function testWorldCoordinateDerivation() {
  assert.deepEqual(getGalaxyLayoutWorldPosition({ x: 62, y: 41 }), { x: 4, z: -3 });
  assert.deepEqual(getGalaxyLayoutWorldPosition({}), { x: 0, z: 0 });
}

function testStructureVisitActionsAreExplicit() {
  assert.deepEqual({
    starter_dome: getGalaxyStructureVisitAction('starter_dome'),
    star_lamp: getGalaxyStructureVisitAction('star_lamp'),
    lumen_tree: getGalaxyStructureVisitAction('lumen_tree'),
    crystal_pond: getGalaxyStructureVisitAction('crystal_pond'),
    rover_bay: getGalaxyStructureVisitAction('rover_bay'),
    observatory: getGalaxyStructureVisitAction('observatory'),
    friend_greenhouse: getGalaxyStructureVisitAction('friend_greenhouse'),
    prism_pathlight: getGalaxyStructureVisitAction('prism_pathlight'),
    starflower_garden: getGalaxyStructureVisitAction('starflower_garden'),
    creature_habitat: getGalaxyStructureVisitAction('creature_habitat'),
    signal_plaza: getGalaxyStructureVisitAction('signal_plaza'),
    expedition_beacon: getGalaxyStructureVisitAction('expedition_beacon'),
    route_gateway: getGalaxyStructureVisitAction('route_gateway'),
    wild_sprout: getGalaxyStructureVisitAction('wild_sprout'),
  }, {
    starter_dome: 'repair',
    star_lamp: 'admire',
    lumen_tree: 'water',
    crystal_pond: 'water',
    rover_bay: 'repair',
    observatory: 'repair',
    friend_greenhouse: 'water',
    prism_pathlight: 'repair',
    starflower_garden: 'water',
    creature_habitat: 'feed',
    signal_plaza: 'admire',
    expedition_beacon: 'repair',
    route_gateway: 'admire',
    wild_sprout: 'water',
  });
  assert.equal(getGalaxyStructureVisitAction('unknown_object'), '');
}

function testStructureVisitUsesServerLayoutAndAction() {
  const layout = [{
    instanceId: 'greenhouse_1',
    itemId: 'friend_greenhouse',
    name: '함께 키우는 온실',
    x: 62,
    y: 41,
  }];
  const valid = planGalaxyStructureVisit({
    layout,
    instanceId: 'greenhouse_1',
    actionId: 'water',
    clientPosition: { x: 4.2, z: -3.1 },
  });
  assert.equal(valid.kind, 'valid');
  assert.equal(valid.structure.name, '함께 키우는 온실');
  assert.deepEqual(valid.position, { x: 4, z: -3 });

  assert.deepEqual(planGalaxyStructureVisit({
    layout,
    instanceId: 'missing',
    actionId: 'water',
  }), { kind: 'not_found' });
  assert.deepEqual(planGalaxyStructureVisit({
    layout,
    instanceId: 'greenhouse_1',
    actionId: 'repair',
  }), { kind: 'action_mismatch', expectedActionId: 'water' });
  assert.equal(planGalaxyStructureVisit({
    layout,
    instanceId: 'greenhouse_1',
    actionId: 'water',
    clientPosition: { x: 8, z: -3 },
  }).kind, 'stale_position');
}

function testDescriptionFallbacks() {
  assert.match(getGalaxyItemDefaultDescription('star_lamp'), /귀환/);
  assert.match(getGalaxyItemDefaultDescription('starter_dome'), /개척자/);
  assert.match(getGalaxyItemDefaultDescription('wild_sprout'), /루멘 새싹/);
  assert.ok(getGalaxyItemDefaultDescription('unknown_object').length > 0);
}

function testObjectUpgradeCatalogContract() {
  Object.entries(GALAXY_ITEM_CATALOG).forEach(([itemId, item]) => {
    assert.equal(item.maxLevel, 2, `${itemId} should use the shared two-stage contract`);
    assert.ok(Number(item.stage2Cost) > 0, `${itemId} should define a Stage 2 ore cost`);
    assert.equal(typeof item.stage2Available, 'boolean');
  });
  assert.equal(GALAXY_ITEM_CATALOG.lumen_tree.stage2Available, true);
  assert.equal(GALAXY_ITEM_CATALOG.lumen_tree.stage2Cost, 45);
  assert.equal(GALAXY_ITEM_CATALOG.star_lamp.stage2Available, true);
  assert.equal(GALAXY_ITEM_CATALOG.star_lamp.stage2Cost, 20);
  assert.equal(GALAXY_ITEM_CATALOG.rover_bay.stage2Available, true);
  assert.equal(GALAXY_ITEM_CATALOG.rover_bay.stage2Cost, 100);
  assert.equal(GALAXY_ITEM_CATALOG.crystal_pond.stage2Available, true);
  assert.equal(GALAXY_ITEM_CATALOG.crystal_pond.stage2Cost, 70);
  assert.equal(
    Object.entries(GALAXY_ITEM_CATALOG)
      .filter(([, item]) => item.stage2Available)
      .map(([itemId]) => itemId)
      .sort()
      .join(','),
    'crystal_pond,lumen_tree,rover_bay,star_lamp',
  );
}

function testFirebaseStorageImageValidation() {
  assert.equal(isGalaxyObjectImagePath(UID, INSTANCE_ID, IMAGE_PATH), true);
  assert.equal(isGalaxyObjectImagePath(UID, INSTANCE_ID, `galaxy-objects/${UID}/${INSTANCE_ID}/../escape.webp`), false);
  assert.deepEqual(validateGalaxyObjectImage({
    uid: UID,
    instanceId: INSTANCE_ID,
    imagePath: IMAGE_PATH,
    imageUrl: IMAGE_URL,
  }), {
    valid: true,
    imagePath: IMAGE_PATH,
    imageUrl: IMAGE_URL,
  });
  assert.deepEqual(validateGalaxyObjectImage({
    uid: UID,
    instanceId: INSTANCE_ID,
    imagePath: '',
    imageUrl: '',
  }), { valid: true, imagePath: '', imageUrl: '' });

  const wrongUidPath = `galaxy-objects/another-user/${INSTANCE_ID}/frontier-photo.webp`;
  assert.equal(validateGalaxyObjectImage({
    uid: UID,
    instanceId: INSTANCE_ID,
    imagePath: wrongUidPath,
    imageUrl: IMAGE_URL,
  }).valid, false);
  assert.equal(validateGalaxyObjectImage({
    uid: UID,
    instanceId: INSTANCE_ID,
    imagePath: IMAGE_PATH,
    imageUrl: `https://example.com/${encodeURIComponent(IMAGE_PATH)}`,
  }).valid, false);
  assert.equal(validateGalaxyObjectImage({
    uid: UID,
    instanceId: INSTANCE_ID,
    imagePath: IMAGE_PATH,
    imageUrl: `https://firebasestorage.googleapis.com/v0/b/another-project.appspot.com/o/${encodeURIComponent(IMAGE_PATH)}?alt=media`,
  }).valid, false);
  assert.equal(validateGalaxyObjectImage({
    uid: UID,
    instanceId: INSTANCE_ID,
    imagePath: IMAGE_PATH,
    imageUrl: IMAGE_URL.replace('frontier-photo.webp', 'different-photo.webp'),
  }).valid, false);
}

function run() {
  testPlacementValidationAndSelfExclusion();
  testWorldCoordinateDerivation();
  testStructureVisitActionsAreExplicit();
  testStructureVisitUsesServerLayoutAndAction();
  testDescriptionFallbacks();
  testObjectUpgradeCatalogContract();
  testFirebaseStorageImageValidation();
  console.log('Galaxy world object tests passed.');
}

run();

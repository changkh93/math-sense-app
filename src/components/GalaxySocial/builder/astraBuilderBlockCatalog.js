const FACE_ALL = Object.freeze(['top', 'bottom', 'north', 'south', 'east', 'west'])

export const ASTRA_BUILDER_BLOCK_TRAITS = Object.freeze({
  1: Object.freeze({ bodyShape: 'full', supportSurface: 'top', headBlocking: true, buildFaces: FACE_ALL, acousticMaterial: 'stone' }),
  2: Object.freeze({ bodyShape: 'floor', supportSurface: 'floor', headBlocking: true, buildFaces: FACE_ALL, acousticMaterial: 'stone' }),
  3: Object.freeze({ bodyShape: 'full', supportSurface: 'top', headBlocking: true, buildFaces: FACE_ALL, acousticMaterial: 'glass' }),
  4: Object.freeze({ bodyShape: 'full', supportSurface: 'none', headBlocking: true, buildFaces: FACE_ALL, acousticMaterial: 'glass' }),
  5: Object.freeze({ bodyShape: 'stair', supportSurface: 'stair', headBlocking: true, buildFaces: FACE_ALL, acousticMaterial: 'stone' }),
  6: Object.freeze({ bodyShape: 'pillar', supportSurface: 'none', headBlocking: true, buildFaces: FACE_ALL, acousticMaterial: 'metal' }),
  7: Object.freeze({ bodyShape: 'doorway', supportSurface: 'none', headBlocking: false, buildFaces: Object.freeze(['top', 'north', 'south', 'east', 'west']), acousticMaterial: 'wood' }),
  8: Object.freeze({ bodyShape: 'full', supportSurface: 'top', headBlocking: true, heightCells: 3, buildFaces: FACE_ALL, acousticMaterial: 'stone' }),
})

const EMPTY_TRAITS = Object.freeze({
  bodyShape: 'none',
  supportSurface: 'none',
  headBlocking: false,
  buildFaces: Object.freeze([]),
  acousticMaterial: 'soft',
})

export function getAstraBuilderBlockTraits(blockType) {
  return ASTRA_BUILDER_BLOCK_TRAITS[Number(blockType)] || EMPTY_TRAITS
}

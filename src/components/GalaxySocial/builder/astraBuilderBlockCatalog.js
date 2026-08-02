import {
  getAstraBuilderMaterial,
  getAstraBuilderPartForRecipe,
  getAstraBuilderRecipe,
} from './astraBuilderRecipeCatalog.js'

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
  9: Object.freeze({ bodyShape: 'bar', supportSurface: 'none', headBlocking: false, buildFaces: FACE_ALL, acousticMaterial: 'glass' }),
})

const EMPTY_TRAITS = Object.freeze({
  bodyShape: 'none',
  supportSurface: 'none',
  headBlocking: false,
  buildFaces: Object.freeze([]),
  acousticMaterial: 'soft',
})

export function getAstraBuilderBlockTraits(recipeOrBlockType) {
  const recipe = getAstraBuilderRecipe(recipeOrBlockType)
  const part = recipe ? getAstraBuilderPartForRecipe(recipe.id) : null
  if (!recipe || !part) return ASTRA_BUILDER_BLOCK_TRAITS[Number(recipeOrBlockType)] || EMPTY_TRAITS
  const material = getAstraBuilderMaterial(recipe.materialId)
  return {
    bodyShape: part.bodyShape,
    supportSurface: part.supportSurface,
    headBlocking: part.headBlocking,
    heightCells: part.heightCells,
    buildFaces: part.bodyShape === 'doorway'
      ? ASTRA_BUILDER_BLOCK_TRAITS[7].buildFaces
      : FACE_ALL,
    acousticMaterial: material?.family === 'wood'
      ? 'wood'
      : material?.family === 'metal'
        ? 'metal'
        : material?.family === 'glass' || material?.family === 'light'
          ? 'glass'
          : 'stone',
  }
}

const freeze = (value) => Object.freeze(value)

export const ASTRA_BUILDER_PARTS = freeze({
  lumen_wall: freeze({ id: 'lumen_wall', legacyBlockType: 1, label: '벽', bodyShape: 'full', heightCells: 1, supportSurface: 'top', headBlocking: true, rotationSteps: 1, underlayPolicy: 'allowed', renderGeometryKey: 'box' }),
  foundation_floor: freeze({ id: 'foundation_floor', legacyBlockType: 2, label: '바닥', bodyShape: 'floor', heightCells: 1, supportSurface: 'floor', headBlocking: true, rotationSteps: 1, underlayPolicy: 'none', renderGeometryKey: 'box' }),
  nebula_glass: freeze({ id: 'nebula_glass', legacyBlockType: 3, label: '유리 벽', bodyShape: 'full', heightCells: 1, supportSurface: 'top', headBlocking: true, rotationSteps: 1, underlayPolicy: 'allowed', renderGeometryKey: 'box' }),
  star_light: freeze({ id: 'star_light', legacyBlockType: 4, label: '별빛 조명', bodyShape: 'full', heightCells: 1, supportSurface: 'none', headBlocking: true, rotationSteps: 1, underlayPolicy: 'allowed', renderGeometryKey: 'box' }),
  stair_straight: freeze({ id: 'stair_straight', legacyBlockType: 5, label: '직선 계단', bodyShape: 'stair', heightCells: 1, supportSurface: 'stair', headBlocking: true, rotationSteps: 4, underlayPolicy: 'allowed', renderGeometryKey: 'stair' }),
  support_pillar: freeze({ id: 'support_pillar', legacyBlockType: 6, label: '지지 기둥', bodyShape: 'pillar', heightCells: 1, supportSurface: 'none', headBlocking: true, rotationSteps: 1, underlayPolicy: 'allowed', renderGeometryKey: 'box' }),
  lumen_wood_door: freeze({ id: 'lumen_wood_door', legacyBlockType: 7, label: '문', bodyShape: 'doorway', heightCells: 3, supportSurface: 'none', headBlocking: false, rotationSteps: 4, underlayPolicy: 'allowed', renderGeometryKey: 'door' }),
  lumen_wall_panel: freeze({ id: 'lumen_wall_panel', legacyBlockType: 8, label: '3칸 벽 패널', bodyShape: 'full', heightCells: 3, supportSurface: 'top', headBlocking: true, rotationSteps: 1, underlayPolicy: 'allowed', renderGeometryKey: 'box' }),
  light_bar: freeze({ id: 'light_bar', legacyBlockType: 9, label: '빛 막대', bodyShape: 'bar', heightCells: 1, supportSurface: 'none', headBlocking: false, rotationSteps: 4, underlayPolicy: 'allowed', renderGeometryKey: 'bar' }),
})

export const ASTRA_BUILDER_MATERIALS = {
  lumen: { id: 'lumen', label: '루멘 패널', family: 'stone', roughness: .52, metalness: .12 },
  orbital_wood: { id: 'orbital_wood', label: '궤도 목재', family: 'wood', roughness: .82, metalness: .03 },
  moonstone: { id: 'moonstone', label: '월석', family: 'stone', roughness: .7, metalness: .05 },
  alloy: { id: 'alloy', label: '우주 합금', family: 'metal', roughness: .38, metalness: .52 },
  nebula_glass: { id: 'nebula_glass', label: '성운 유리', family: 'glass', roughness: .08, metalness: .3 },
  starlight: { id: 'starlight', label: '별빛 발광체', family: 'light', roughness: .3, metalness: .05 },
}

const recipe = (id, partId, materialId, variantId, finishId, label, color, extra = {}) => freeze({
  id,
  partId,
  legacyBlockType: ASTRA_BUILDER_PARTS[partId]?.legacyBlockType || 0,
  materialId,
  variantId,
  finishId,
  label,
  color,
  setId: `${materialId}_basic`,
  deprecated: false,
  ...extra,
})

// IDs 1~8 permanently mirror the original block types. New IDs are append-only.
export const ASTRA_BUILDER_RECIPES = freeze([
  recipe(1, 'lumen_wall', 'lumen', 'frost', 'smooth', '루멘 벽 · 서리백', '#b9cbcc'),
  recipe(2, 'foundation_floor', 'moonstone', 'blue_gray', 'smooth', '기초 바닥 · 청회색', '#607989'),
  recipe(3, 'nebula_glass', 'nebula_glass', 'cyan', 'clear', '성운 유리 · 청록', '#72dff1', { transparent: true }),
  recipe(4, 'star_light', 'starlight', 'warm_white', 'glow', '별빛 조명 · 온백색', '#ffe58a', { emissive: true }),
  recipe(5, 'stair_straight', 'lumen', 'frost', 'smooth', '직선 계단 · 루멘', '#9bb6b7'),
  recipe(6, 'support_pillar', 'alloy', 'blue_gray', 'smooth', '지지 기둥 · 합금', '#476171'),
  recipe(7, 'lumen_wood_door', 'orbital_wood', 'walnut', 'vertical_grain', '나무 문 · 호두', '#a86f42'),
  recipe(8, 'lumen_wall_panel', 'lumen', 'frost', 'smooth', '3칸 벽 패널 · 루멘', '#dbe9e8'),
  recipe(9, 'lumen_wall', 'lumen', 'cyan', 'grooved', '루멘 벽 · 청록 홈', '#4bc9c2'),
  recipe(10, 'lumen_wall', 'lumen', 'navy', 'grooved', '루멘 벽 · 남색 홈', '#34566f'),
  recipe(11, 'lumen_wall', 'lumen', 'graphite', 'smooth', '루멘 벽 · 흑연', '#33424d'),
  recipe(12, 'foundation_floor', 'orbital_wood', 'birch', 'horizontal_grain', '목재 바닥 · 자작', '#d4b98a'),
  recipe(13, 'foundation_floor', 'orbital_wood', 'walnut', 'horizontal_grain', '목재 바닥 · 호두', '#8c5b3c'),
  recipe(14, 'foundation_floor', 'nebula_glass', 'clear', 'clear', '유리 바닥 · 투명', '#b9f4ff', { transparent: true }),
  recipe(15, 'foundation_floor', 'nebula_glass', 'violet', 'clear', '유리 바닥 · 보라', '#bca1ff', { transparent: true }),
  recipe(16, 'lumen_wall', 'orbital_wood', 'birch', 'vertical_grain', '목재 벽 · 자작', '#d4b98a'),
  recipe(17, 'lumen_wall', 'orbital_wood', 'pine', 'vertical_grain', '목재 벽 · 소나무', '#b88354'),
  recipe(18, 'lumen_wall', 'orbital_wood', 'walnut', 'vertical_grain', '목재 벽 · 호두', '#8c5b3c'),
  recipe(19, 'lumen_wall', 'orbital_wood', 'charred', 'vertical_grain', '목재 벽 · 탄화목', '#3e3230'),
  recipe(20, 'stair_straight', 'orbital_wood', 'walnut', 'horizontal_grain', '목재 계단 · 호두', '#8c5b3c'),
  recipe(21, 'support_pillar', 'orbital_wood', 'walnut', 'vertical_grain', '목재 기둥 · 호두', '#8c5b3c'),
  recipe(22, 'nebula_glass', 'nebula_glass', 'violet', 'clear', '성운 유리 · 보라', '#bca1ff', { transparent: true }),
  recipe(23, 'nebula_glass', 'nebula_glass', 'smoke', 'frosted', '성운 유리 · 스모크', '#7d9ca7', { transparent: true }),
  recipe(24, 'star_light', 'starlight', 'cyan', 'glow', '별빛 조명 · 청록', '#5ff4ee', { emissive: true }),
  recipe(25, 'star_light', 'starlight', 'violet', 'glow', '별빛 조명 · 보라', '#ba8bff', { emissive: true }),
  recipe(26, 'star_light', 'starlight', 'magenta', 'glow', '별빛 조명 · 자홍', '#ff78d3', { emissive: true }),
  recipe(27, 'star_light', 'starlight', 'lime', 'glow', '별빛 조명 · 연두', '#b8ff76', { emissive: true }),
  recipe(28, 'light_bar', 'starlight', 'warm_white', 'glow', '빛 막대 · 온백색', '#ffe58a', { emissive: true }),
  recipe(29, 'light_bar', 'starlight', 'cyan', 'glow', '빛 막대 · 청록', '#5ff4ee', { emissive: true }),
  recipe(30, 'light_bar', 'starlight', 'violet', 'glow', '빛 막대 · 보라', '#ba8bff', { emissive: true }),
  recipe(31, 'light_bar', 'starlight', 'magenta', 'glow', '빛 막대 · 자홍', '#ff78d3', { emissive: true }),
  recipe(32, 'light_bar', 'starlight', 'lime', 'glow', '빛 막대 · 연두', '#b8ff76', { emissive: true }),
])

export const ASTRA_BUILDER_CATALOG_VERSION = 2

function hashCatalog(value) {
  let hash = 0x811c9dc5
  for (const character of JSON.stringify(value)) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export const ASTRA_BUILDER_CATALOG_SIGNATURE = freeze(ASTRA_BUILDER_RECIPES.map((item) => freeze({
  id: item.id,
  partId: item.partId,
  legacyBlockType: item.legacyBlockType,
  rotationSteps: ASTRA_BUILDER_PARTS[item.partId]?.rotationSteps || 1,
})))
export const ASTRA_BUILDER_CATALOG_HASH = hashCatalog(ASTRA_BUILDER_CATALOG_SIGNATURE)

export const ASTRA_BUILDER_RECIPE_BY_ID = new Map(ASTRA_BUILDER_RECIPES.map((item) => [item.id, item]))
export const ASTRA_BUILDER_PART_BY_ID = new Map(Object.values(ASTRA_BUILDER_PARTS).map((item) => [item.id, item]))

export function getAstraBuilderRecipe(recipeId) {
  return ASTRA_BUILDER_RECIPE_BY_ID.get(Number(recipeId)) || null
}

export function getAstraBuilderPart(partId) {
  return ASTRA_BUILDER_PART_BY_ID.get(String(partId)) || null
}

export function getAstraBuilderPartForRecipe(recipeId) {
  const item = getAstraBuilderRecipe(recipeId)
  return item ? getAstraBuilderPart(item.partId) : null
}

export function getAstraBuilderStyleForRecipe(recipeId) {
  const item = getAstraBuilderRecipe(recipeId)
  return item ? { materialId: item.materialId, variantId: item.variantId, finishId: item.finishId } : null
}

export function getAstraBuilderMaterial(materialId) {
  return ASTRA_BUILDER_MATERIALS[String(materialId)] || null
}

export function getAstraBuilderRenderProfile(recipeId) {
  const item = getAstraBuilderRecipe(recipeId)
  const material = item ? getAstraBuilderMaterial(item.materialId) : null
  if (!item || !material) return null
  const isGlass = material.family === 'glass' || item.transparent === true
  const isLight = material.family === 'light' || item.emissive === true
  const isWood = material.family === 'wood'
  const isFrosted = item.finishId === 'frosted'
  return {
    family: material.family,
    textureKind: isWood ? 'wood_grain' : 'none',
    grainDirection: item.finishId === 'vertical_grain' ? 'vertical' : 'horizontal',
    transparent: isGlass,
    opacity: isGlass ? (isFrosted ? 0.46 : item.variantId === 'clear' ? 0.2 : 0.3) : 1,
    transmission: isGlass && !isFrosted ? 0.42 : 0,
    roughness: isGlass ? (isFrosted ? 0.36 : 0.08) : material.roughness,
    metalness: isGlass ? 0.04 : material.metalness,
    emissive: isLight,
    emissiveIntensity: isLight ? 1.65 : 0,
  }
}

export function getAstraBuilderRecipesForPart(partId) {
  return ASTRA_BUILDER_RECIPES.filter((item) => item.partId === partId && !item.deprecated)
}

export function getAstraBuilderCompatibleRecipe(partId, style = {}) {
  return getAstraBuilderRecipesForPart(partId).find((item) => (
    item.materialId === style.materialId
    && item.variantId === style.variantId
    && (!style.finishId || item.finishId === style.finishId)
  )) || null
}

export const ASTRA_BUILDER_QUICKBAR_CORE_RECIPE_IDS = Object.freeze([1, 2, 3, 5, 6, 4])
export const ASTRA_BUILDER_QUICKBAR_FALLBACK_RECIPE_IDS = Object.freeze([12, 20])
export const ASTRA_BUILDER_PALETTE_RECIPES = Object.freeze(
  ASTRA_BUILDER_QUICKBAR_CORE_RECIPE_IDS.map((id) => getAstraBuilderRecipe(id)),
)

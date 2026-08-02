export const ASTRA_BUILDER_QUICKBAR_RECENT_LIMIT = 2
export const ASTRA_BUILDER_RECENT_STORAGE_KEY = 'metasense-astra-builder-recent-v1'

const uniqueValidIds = (ids, validIds) => {
  const valid = validIds instanceof Set ? validIds : new Set(validIds || [])
  return [...new Set((ids || []).map(Number).filter((id) => valid.has(id)))]
}

export function normalizeAstraBuilderRecentRecipeIds(
  ids,
  { validIds = [], excludedIds = [], limit = ASTRA_BUILDER_QUICKBAR_RECENT_LIMIT } = {},
) {
  const excluded = new Set(excludedIds.map(Number))
  return uniqueValidIds(ids, validIds)
    .filter((id) => !excluded.has(id))
    .slice(0, limit)
}

export function recordAstraBuilderRecentRecipeId(
  currentIds,
  recipeId,
  options = {},
) {
  return normalizeAstraBuilderRecentRecipeIds(
    [Number(recipeId), ...(currentIds || [])],
    options,
  )
}

export function buildAstraBuilderQuickbarItems({
  recipes = [],
  coreIds = [],
  recentIds = [],
  fallbackIds = [],
  recentLimit = ASTRA_BUILDER_QUICKBAR_RECENT_LIMIT,
} = {}) {
  const recipeById = new Map(recipes.map((recipe) => [Number(recipe.id), recipe]))
  const core = uniqueValidIds(coreIds, recipeById.keys())
  const recent = normalizeAstraBuilderRecentRecipeIds(recentIds, {
    validIds: recipeById.keys(),
    excludedIds: core,
    limit: recentLimit,
  })
  const occupied = new Set([...core, ...recent])
  const fallbacks = uniqueValidIds(fallbackIds, recipeById.keys())
    .filter((id) => !occupied.has(id))
    .slice(0, Math.max(0, recentLimit - recent.length))

  return [
    ...core.map((id) => ({ recipe: recipeById.get(id), source: 'core' })),
    ...recent.map((id) => ({ recipe: recipeById.get(id), source: 'recent' })),
    ...fallbacks.map((id) => ({ recipe: recipeById.get(id), source: 'recommended' })),
  ]
}

export const ASTRA_BUILDER_BUILD_POINTER_BUTTON = 0
export const ASTRA_BUILDER_VIEW_POINTER_BUTTONS = Object.freeze([0, 1, 2])
export const ASTRA_BUILDER_VIEW_POINTER_MASK = 1 | 2 | 4
export const ASTRA_BUILDER_CLICK_DRAG_THRESHOLD = 5

export function isAstraBuilderBuildPointer(event) {
  return Number(event?.button) === ASTRA_BUILDER_BUILD_POINTER_BUTTON
}

export function isAstraBuilderViewPointer(event) {
  return ASTRA_BUILDER_VIEW_POINTER_BUTTONS.includes(Number(event?.button))
}

export function isAstraBuilderViewDrag(buttons) {
  return Boolean(Number(buttons || 0) & ASTRA_BUILDER_VIEW_POINTER_MASK)
}

export function isAstraBuilderPlacementClick(event) {
  const pointerTravel = Number(event?.delta || 0)
  return isAstraBuilderBuildPointer(event)
    && Number.isFinite(pointerTravel)
    && pointerTravel <= ASTRA_BUILDER_CLICK_DRAG_THRESHOLD
}

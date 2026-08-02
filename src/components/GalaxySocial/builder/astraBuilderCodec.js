import { encodeAstraBuilderCell } from './astraBuilderModel.js'
import { getAstraBuilderPartForRecipe } from './astraBuilderRecipeCatalog.js'

function bytesToBase64(bytes) {
  let binary = ''
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index])
  }
  return globalThis.btoa(binary)
}

function base64ToBytes(value) {
  if (
    typeof value !== 'string'
    || value.length === 0
    || value.length % 4 !== 0
    || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)
  ) return null
  try {
    const binary = globalThis.atob(value)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index)
    }
    return bytes
  } catch {
    return null
  }
}

export const ASTRA_BUILDER_ENCODING_V1 = 'u16le-v1'
export const ASTRA_BUILDER_ENCODING_V2 = 'u32le-v2'

export function encodeAstraBuilderGridBase64(cells, encoding = '') {
  if (!(cells instanceof Uint16Array) && !(cells instanceof Uint32Array)) return ''
  const useV1 = encoding === ASTRA_BUILDER_ENCODING_V1 || cells instanceof Uint16Array
  const bytes = new Uint8Array(cells.length * (useV1 ? 2 : 4))
  const view = new DataView(bytes.buffer)
  for (let index = 0; index < cells.length; index += 1) {
    if (useV1) view.setUint16(index * 2, cells[index] & 0xffff, true)
    else view.setUint32(index * 4, cells[index] >>> 0, true)
  }
  return bytesToBase64(bytes)
}

export function decodeAstraBuilderGridBase64(value, expectedCellCount, encoding = '') {
  const bytes = base64ToBytes(value)
  const detectedV1 = encoding === ASTRA_BUILDER_ENCODING_V1
    || (!encoding && bytes?.byteLength === expectedCellCount * 2)
  const detectedV2 = encoding === ASTRA_BUILDER_ENCODING_V2
    || (!encoding && bytes?.byteLength === expectedCellCount * 4)
  if (
    !bytes
    || !Number.isInteger(expectedCellCount)
    || (!detectedV1 && !detectedV2)
    || bytes.byteLength !== expectedCellCount * (detectedV1 ? 2 : 4)
  ) return null
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const cells = new Uint32Array(expectedCellCount)
  for (let index = 0; index < expectedCellCount; index += 1) {
    cells[index] = detectedV1
      ? encodeAstraBuilderV1Cell(view.getUint16(index * 2, true))
      : view.getUint32(index * 4, true)
  }
  return cells
}

export function encodeAstraBuilderV1Cell(value) {
  const normalized = Number(value) & 0xffff
  const blockType = normalized & 0xff
  const rawRotation = (normalized >>> 8) & 0x03
  const rotationSteps = getAstraBuilderPartForRecipe(blockType)?.rotationSteps || 1
  const rotation = rawRotation % rotationSteps
  const foundationUnderlay = (normalized & 0x0400) !== 0
  return blockType
    ? encodeAstraBuilderCell(blockType, rotation, foundationUnderlay)
    : 0
}

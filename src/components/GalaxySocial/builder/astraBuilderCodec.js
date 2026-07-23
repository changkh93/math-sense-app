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

export function encodeAstraBuilderGridBase64(cells) {
  if (!(cells instanceof Uint16Array)) return ''
  const bytes = new Uint8Array(cells.length * 2)
  const view = new DataView(bytes.buffer)
  for (let index = 0; index < cells.length; index += 1) {
    view.setUint16(index * 2, cells[index], true)
  }
  return bytesToBase64(bytes)
}

export function decodeAstraBuilderGridBase64(value, expectedCellCount) {
  const bytes = base64ToBytes(value)
  if (
    !bytes
    || !Number.isInteger(expectedCellCount)
    || bytes.byteLength !== expectedCellCount * 2
  ) return null
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const cells = new Uint16Array(expectedCellCount)
  for (let index = 0; index < expectedCellCount; index += 1) {
    cells[index] = view.getUint16(index * 2, true)
  }
  return cells
}

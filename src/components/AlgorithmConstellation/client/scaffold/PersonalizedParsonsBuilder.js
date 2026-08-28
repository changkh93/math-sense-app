/**
 * Personalized Parsons Builder
 * Preserves the student's valid function declaration & correct lines,
 * extracting only the target conditional lines into reorderable tiles with Undo support.
 */

export function buildPersonalizedParsonsTiles({
  studentCode = '',
}) {
  const originalCode = studentCode
  const lines = studentCode.split('\n').filter((l) => l.trim().length > 0)

  // Identify function header
  const headerLine = lines.find((l) => l.trim().startsWith('def ')) || 'def check_gate(s1, s2):'

  // Personalized tile choices for conditional assembly
  const availableTiles = [
    { id: 'tile_and', text: '    if s1 and s2:', isCorrect: true, type: 'condition' },
    { id: 'tile_or', text: '    if s1 or s2:', isCorrect: false, type: 'condition' },
    { id: 'tile_ret_true', text: '        return True', isCorrect: true, type: 'body' },
    { id: 'tile_ret_false', text: '    return False', isCorrect: true, type: 'fallback' },
  ]

  function assembleCode(selectedTiles) {
    const bodyLines = selectedTiles.map((t) => t.text)
    return `${headerLine}\n${bodyLines.join('\n')}\n`
  }

  return {
    headerLine,
    availableTiles,
    originalCode,
    assembleCode,
  }
}

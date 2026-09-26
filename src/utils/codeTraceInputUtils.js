export function isCodeTraceCommentOnlyLine(line = '') {
  return String(line || '').trimStart().startsWith('#');
}

export function hasCodeTraceSubstantiveInput(code = '') {
  return String(code || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .some(line => !isCodeTraceCommentOnlyLine(line) && line.trim().length > 0);
}

export function canPassCodeTrace({
  studentCode = '',
  perfect = false,
  accuracy = 0,
  passingAccuracy = 95,
} = {}) {
  if (!hasCodeTraceSubstantiveInput(studentCode)) return false;
  return perfect === true || Number(accuracy) >= Number(passingAccuracy);
}

import assert from 'node:assert/strict'
import { getCodeTraceLineProgress, getCodeTraceResumeState, isCodeTraceProgressComplete } from '../src/utils/codeTraceProgressUtils.js'
import { canPassCodeTrace, hasCodeTraceSubstantiveInput, isCodeTraceCommentOnlyLine } from '../src/utils/codeTraceInputUtils.js'

const exerciseIds = ['code-1', 'code-2', 'code-3', 'code-4', 'code-5']

assert.equal(
  isCodeTraceProgressComplete({ completed: true }, exerciseIds),
  true,
  '명시적인 완료 플래그를 완료로 판정해야 합니다.'
)

const exercises = exerciseIds.map(id => ({ id }))

assert.deepEqual(
  getCodeTraceResumeState(exercises, {
    completedExerciseIds: [],
    lastExerciseId: 'code-1',
    lastMode: 'recall',
    drafts: { 'code-1': 'import pygame\npygame.init()' },
  }),
  {
    exerciseIndex: 0,
    exerciseId: 'code-1',
    studentCode: 'import pygame\npygame.init()',
    mode: 'recall',
  },
  '첫 번째 미완료 세트도 저장된 초안을 편집기에 복원해야 합니다.'
)

assert.deepEqual(
  getCodeTraceResumeState(exercises, {
    completedExerciseIds: ['code-1'],
    lastExerciseId: 'code-4',
    lastMode: 'line',
    drafts: { 'code-4': 'class Game:\n  pass' },
  }),
  {
    exerciseIndex: 3,
    exerciseId: 'code-4',
    studentCode: 'class Game:\n  pass',
    mode: 'line',
  },
  '마지막으로 작성하던 미완료 세트와 모드를 복원해야 합니다.'
)

assert.deepEqual(
  getCodeTraceResumeState(exercises, {
    completedExerciseIds: ['code-1', 'code-2'],
    lastExerciseId: 'removed-code',
    drafts: { 'removed-code': 'stale draft' },
  }),
  {
    exerciseIndex: 2,
    exerciseId: 'code-3',
    studentCode: '',
    mode: 'recall',
  },
  '콘텐츠가 바뀌어 마지막 ID가 사라졌다면 현재 첫 미완료 세트로 안전하게 이동해야 합니다.'
)

assert.equal(
  isCodeTraceProgressComplete({
    completed: false,
    completedExerciseIds: exerciseIds,
  }, exerciseIds),
  true,
  '모든 현재 exercise ID가 완료되었다면 잘못 덮인 완료 플래그를 보정해야 합니다.'
)

assert.equal(
  isCodeTraceProgressComplete({
    completed: false,
    completedExerciseIds: exerciseIds.slice(0, 4),
  }, exerciseIds),
  false,
  '미완료 exercise가 남아 있으면 완료로 판정하지 않아야 합니다.'
)

assert.equal(
  isCodeTraceProgressComplete({
    completed: false,
    completedExerciseIds: [...exerciseIds.slice(0, 4), 'old-code-5'],
  }, exerciseIds),
  false,
  '개수만 같고 현재 콘텐츠의 ID가 다르면 완료로 판정하지 않아야 합니다.'
)

const longExercises = [
  { id: 'long', answerCode: Array.from({ length: 60 }, (_, i) => `print(${i})`).join('\n') },
  { docId: 'other', answerCode: 'a = 1\nb = 2\nc = 3' },
]
const savedLineSession = {
  lastMode: 'line', lastExerciseId: 'long',
  drafts: { long: Array(40).fill('print(1)').join('\n') + '\n    ' },
  visibleLinesByExercise: { long: 40, other: 2, removed: 99 },
}
assert.deepEqual(getCodeTraceLineProgress(longExercises, JSON.parse(JSON.stringify(savedLineSession))),
  { long: 40, other: 2 }, '40번째 공개 위치와 다른 세트의 독립적인 위치를 복원한다.')
assert.equal(getCodeTraceResumeState(longExercises, savedLineSession).exerciseId, 'long')
assert.deepEqual(getCodeTraceLineProgress(longExercises, { drafts: savedLineSession.drafts }),
  { long: 40, other: 1 }, '기존 데이터는 마지막으로 작성한 줄을 사용하고 빈 끝줄은 제외한다.')
assert.equal(getCodeTraceLineProgress(longExercises, {
  ...savedLineSession, visibleLinesByExercise: { long: 1 },
}).long, 1, '명시적으로 초기화한 위치는 오래된 초안보다 우선한다.')
assert.equal(getCodeTraceLineProgress(longExercises, {
  visibleLinesByExercise: { long: 999 },
}).long, 60, '콘텐츠가 짧아지면 마지막 줄 범위로 제한한다.')
for (const invalid of [null, '40', -5, 0, NaN, Infinity]) {
  assert.equal(getCodeTraceLineProgress(longExercises, {
    drafts: savedLineSession.drafts, visibleLinesByExercise: { long: invalid },
  }).long, 40, '잘못된 저장값은 초안으로 복구한다.')
}
assert.equal(getCodeTraceLineProgress([{ id: 'comments', answerCode: '# note\r\na\r\n\r\nb' }], {
  drafts: { comments: '# student note\r\na\r\n\r\nb\r\n' },
}).comments, 3, '주석 전용 줄과 CRLF는 실제 코드 트레이스 줄 기준으로 처리한다.')
assert.deepEqual(getCodeTraceLineProgress([], savedLineSession), {})
assert.equal(getCodeTraceLineProgress(longExercises, { visibleLinesByExercise: { long: 40.8 } }).long, 40)

assert.equal(isCodeTraceCommentOnlyLine('#'), true, '# 한 글자도 주석 전용 줄로 판정한다.')
assert.equal(isCodeTraceCommentOnlyLine('  # placeholder'), true, '들여쓴 주석도 주석 전용 줄로 판정한다.')
assert.equal(isCodeTraceCommentOnlyLine('print("#")'), false, '문자열 속 #은 실제 코드로 유지한다.')
assert.equal(hasCodeTraceSubstantiveInput('#'), false, '#만 입력한 답안은 실제 코드가 아니다.')
assert.equal(hasCodeTraceSubstantiveInput('  # first\r\n# second\r\n  '), false, '주석과 공백만 있는 여러 줄 답안도 실제 코드가 아니다.')
assert.equal(hasCodeTraceSubstantiveInput('# optional\nimport pygame'), true, '선택 주석과 함께 실제 코드를 입력하면 유효하다.')
assert.equal(hasCodeTraceSubstantiveInput('print("#")'), true, '문자열 속 #을 포함한 코드는 유효하다.')
assert.equal(canPassCodeTrace({
  studentCode: '#\n  # placeholder',
  perfect: true,
  accuracy: 100,
  passingAccuracy: 95,
}), false, '평가 결과가 잘못 100점이어도 주석뿐인 답안은 통과할 수 없다.')
assert.equal(canPassCodeTrace({
  studentCode: '# optional\nimport pygame',
  perfect: false,
  accuracy: 95,
  passingAccuracy: 95,
}), true, '실제 코드가 있고 기준 정확도를 충족하면 통과한다.')

console.log('code trace progress utils tests passed')

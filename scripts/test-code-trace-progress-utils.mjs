import assert from 'node:assert/strict'
import { isCodeTraceProgressComplete } from '../src/utils/codeTraceProgressUtils.js'

const exerciseIds = ['code-1', 'code-2', 'code-3', 'code-4', 'code-5']

assert.equal(
  isCodeTraceProgressComplete({ completed: true }, exerciseIds),
  true,
  '명시적인 완료 플래그를 완료로 판정해야 합니다.'
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

console.log('code trace progress utils tests passed')

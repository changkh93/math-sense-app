import assert from 'node:assert/strict'
import { getCodeTraceResumeState, isCodeTraceProgressComplete } from '../src/utils/codeTraceProgressUtils.js'

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

console.log('code trace progress utils tests passed')

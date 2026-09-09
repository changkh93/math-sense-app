import test from 'node:test'
import assert from 'node:assert/strict'
import { createProject } from '../src/components/PythonGameStudio/templates.js'
import { moveProjectFile } from '../src/components/PythonGameStudio/projectFolders.js'
test('move entry file to nested folder and back without changing source bytes', () => {
  const original = { ...createProject('이동', 'print("안녕")'), folders: ['assets/images'] }
  const moved = moveProjectFile(original, 'main.py', 'assets/images').project
  assert.equal(moved.entrypoint, 'assets/images/main.py')
  assert.equal(moved.files[0].text, original.files[0].text)
  assert.equal(original.entrypoint, 'main.py')
  const returned = moveProjectFile(moved, moved.entrypoint, '').project
  assert.equal(returned.entrypoint, 'main.py')
  assert.ok(returned.folders.includes('assets/images'))
})
test('same-folder moves are harmless; collisions and stale source/destination fail', () => {
  const original = { ...createProject(), folders: ['images'], files: [...createProject().files, { path: 'images/main.py', kind: 'python', text: 'keep me' }] }
  assert.equal(moveProjectFile(original, 'main.py', '').changed, false)
  assert.throws(() => moveProjectFile(original, 'main.py', 'images'), /같은 이름/)
  assert.throws(() => moveProjectFile(original, 'missing.py', ''), /찾지 못/)
  assert.throws(() => moveProjectFile(original, 'main.py', 'missing'), /찾지 못/)
  assert.equal(original.files[1].text, 'keep me')
})

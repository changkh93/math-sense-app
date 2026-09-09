import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createProject } from '../src/components/PythonGameStudio/templates.js'
import { createStudioAttachments } from '../src/components/PythonGameStudio/assignmentAttachments.js'
import { initialAssignmentCluster } from '../src/components/Space/assignmentNavigation.js'
test('selected Python files retain Unicode, nested paths and immutable contents', async () => {
  const project = createProject('게임', 'print("안녕")')
  project.files.push({ path: 'images/test.py', kind: 'python', text: 'print("NESTED")' })
  const files = createStudioAttachments(project, { paths: ['main.py', 'images/test.py'] })
  project.files[0].text = 'changed'
  assert.equal(files[0].name, '게임/main.py'); assert.equal(await files[0].text(), 'print("안녕")')
  assert.equal(files[1].name, '게임/images/test.py'); assert.equal(await files[1].text(), 'print("NESTED")')
})
test('non-Python files and legacy project mode cannot create attachments', async () => {
  const project = createProject()
  project.files.push({path:'hero.png',kind:'image',data:(await readFile(new URL('../public/python-game-examples/knight.png',import.meta.url))).toString('base64')})
  assert.throws(() => createStudioAttachments(project, { paths: ['hero.png'] }), /\.py/)
  assert.throws(() => createStudioAttachments(project, { mode: 'project' }), /선택/)
  assert.throws(() => createStudioAttachments(project, { paths: ['deleted.py'] }), /변경/)
})
test('archive reload restores its course while ordinary NAV landings remain unselected', () => {
  assert.equal(initialAssignmentCluster('assignment_hub',{search:''},'python'),'python')
  assert.equal(initialAssignmentCluster('assignment_hub',{search:'?clusterId=middle-math'},'python'),'middle-math')
  assert.equal(initialAssignmentCluster('assignment_hub',{search:'',state:{clusterId:'western-classic'}},'python'),'western-classic')
  assert.equal(initialAssignmentCluster('assignment_hub',{search:''},null),null)
  assert.equal(initialAssignmentCluster('planet',{search:''},'python'),null)
})

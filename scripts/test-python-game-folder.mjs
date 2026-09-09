import test from 'node:test'
import assert from 'node:assert/strict'
import { readProjectFolder } from '../src/components/PythonGameStudio/projectFolderImport.js'
const item = (relativePath, text = '') => ({ relativePath, file: new File([text], relativePath.split('/').at(-1)) })
test('folder root is the project name; nested paths and main entry are retained', async () => {
  const result = await readProjectFolder([item('내 게임/main.py', 'print(1)'), item('내 게임/lib/helper.py', 'value=1')])
  assert.equal(result.project.title, '내 게임')
  assert.equal(result.project.entrypoint, 'main.py')
  assert.deepEqual(result.project.files.map(file => file.path), ['main.py', 'lib/helper.py'])
  assert.equal(result.needsEntryChoice, false)
})
test('ignore environment/unsupported files before reading their contents', async () => {
  const unreadable = { size: 999999999, text() { throw new Error('should not read') } }
  const result = await readProjectFolder([item('game/main.py'), { relativePath: 'game/.venv/lib.py', file: unreadable }, { relativePath: 'game/README.md', file: unreadable }])
  assert.equal(result.project.files.length, 1)
  assert.equal(result.skippedCount, 2)
})
test('request an entry choice only for ambiguous Python folders', async () => {
  assert.equal((await readProjectFolder([item('game/start.py')])).needsEntryChoice, false)
  assert.equal((await readProjectFolder([item('game/start.py'), item('game/helper.py')])).needsEntryChoice, true)
})
test('reject mixed roots, colliding paths, absent Python and oversized code', async () => {
  await assert.rejects(readProjectFolder([item('game/main.py'), item('other/helper.py')]), /하나의/)
  await assert.rejects(readProjectFolder([item('game/main.py'), item('game/MAIN.py')]), /겹치는/)
  await assert.rejects(readProjectFolder([item('game/README.md')]), /Python/)
  await assert.rejects(readProjectFolder([{ relativePath: 'game/main.py', file: { size: 201 * 1024 } }]), /크기/)
})

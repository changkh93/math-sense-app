import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { validateProject, normalizePath, bytesToBase64, base64ToBytes, toRunnerProject, RUNTIME_VERSION } from '../src/components/PythonGameStudio/projectPolicy.mjs'
const basic = () => ({ id: 'test-project', title: '테스트 게임', schemaVersion: 1, runtimeVersion: RUNTIME_VERSION, entrypoint: 'main.py', revision: 0, files: [{ path: 'main.py', text: 'print("안녕")' }] })
test('Unicode source and asset paths survive serialization', () => {
  const p = basic(); p.files.push({ path: '도움.py', text: '값 = 3' })
  assert.equal(new TextDecoder().decode(base64ToBytes(toRunnerProject(p).files[0].data)), 'print("안녕")')
  assert.equal(validateProject(p).files[1].path, '도움.py')
})
test('reject traversal, reserved and unsupported files', () => {
  for (const path of ['../main.py','/main.py','C:/main.py','a\\b.py','a//b.py','./main.py','.hidden/main.py','index.html','code.js','image.svg','a\u0000.py']) assert.throws(() => normalizePath(path), path)
})
test('reject conflicting normalized names, missing entry and file/folder overlap', () => {
  for (const path of ['MAIN.py','main.py/sub.py']) { const p=basic();p.files.push({path,text:''});assert.throws(()=>validateProject(p)) }
  const p=basic();p.entrypoint='missing.py';assert.throws(()=>validateProject(p))
})
test('validate genuine assets and reject disguised content', async () => {
  for (const name of ['knight.png','success.ogg']) { const p=basic();p.files.push({path:name,data:bytesToBase64(await readFile(new URL(`../public/python-game-examples/${name}`,import.meta.url)))});assert.equal(validateProject(p).files.length,2) }
  const p=basic();p.files.push({path:'fake.png',data:bytesToBase64(new TextEncoder().encode('<script>bad</script>'))});assert.throws(()=>validateProject(p),/확장자/)
})
test('large payload limits and malformed revisions are rejected', () => {
  const p=basic();p.files[0].text='x'.repeat(201*1024);assert.throws(()=>validateProject(p),/크기/)
  for (const revision of [-1,NaN,1.2,'1']) assert.throws(()=>validateProject({...basic(),revision}))
  assert.throws(()=>base64ToBytes('!!!!'));assert.throws(()=>base64ToBytes('AAA'))
  const bytes=new Uint8Array(1024*1024);assert.equal(base64ToBytes(bytesToBase64(bytes)).length,bytes.length)
})
test('client metadata cannot carry owner or course claims into persistence', () => {
  const clean=validateProject({...basic(),ownerId:'other-student',clusterId:'middle-math',storagePath:'secret',reward:999})
  for(const key of ['ownerId','clusterId','storagePath','reward']) assert.equal(Object.hasOwn(clean,key),false)
})

test('empty folders survive validation/runner payload and old projects remain readable', () => {
  const project = { ...basic(), folders: ['assets/empty'] }
  assert.deepEqual(validateProject(project).folders, ['assets', 'assets/empty'])
  assert.deepEqual(toRunnerProject(project).folders, ['assets', 'assets/empty'])
  assert.deepEqual(validateProject(basic()).folders, [])
})
test('folder traversal, file collisions and case collisions are rejected', () => {
  for (const folders of [['../outside'], ['main.py'], ['main.py/sub'], ['assets', 'ASSETS']]) assert.throws(() => validateProject({ ...basic(), folders }))
})

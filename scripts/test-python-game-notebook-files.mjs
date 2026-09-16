import test from 'node:test'
import assert from 'node:assert/strict'
import { readNotebook, writeNotebook, normalizeNotebook, editNativeCell, notebookSourceText } from '../src/components/PythonGameStudio/notebookFile.mjs'
import { validateProject, toRunnerProject, RUNTIME_VERSION, base64ToBytes } from '../src/components/PythonGameStudio/projectPolicy.mjs'
import { createStudioAttachments } from '../src/components/PythonGameStudio/assignmentAttachments.js'
const base = () => ({ id:'notebook-files-test', title:'수학 노트', schemaVersion:1, runtimeVersion:RUNTIME_VERSION, entrypoint:'main.py', files:[{path:'main.py',text:'print("original")'},{path:'notebook.ipynb',text:writeNotebook()}] })
test('native file keeps boundaries, literal cell markers, Unicode and Markdown through edits', () => {
  const cells = [{type:'code',source:'# %%\nx = """\n# %%\n안녕\n"""'},{type:'markdown',source:'# 관찰\n한글'},{type:'code',source:'x'}]
  const text=writeNotebook(cells)
  assert.deepEqual(readNotebook(text).map(({type,source})=>({type,source})),cells)
  assert.equal(readNotebook(editNativeCell(text,2,'print(x)'))[0].source,cells[0].source)
  assert.equal(readNotebook(editNativeCell(text,2,'print(x)'))[2].source,'print(x)')
})
test('native validation and runner preserve separate .py and .ipynb', () => {
  const project=validateProject(base()); assert.equal(project.files[1].kind,'notebook')
  const modified=validateProject({...project,files:project.files.map(f=>f.kind==='notebook'?{...f,text:editNativeCell(f.text,0,'x=5')}:f)})
  assert.equal(modified.files[0].text,'print("original")')
  const payload=toRunnerProject({...modified,entrypoint:'notebook.ipynb'})
  assert.equal(payload.entrypoint,'notebook.ipynb');assert.equal(JSON.parse(new TextDecoder().decode(base64ToBytes(payload.files[1].data))).nbformat,4)
})
test('imports discard untrusted output, preserve source arrays and reject malformed cells', () => {
  const text=normalizeNotebook(JSON.stringify({nbformat:4,cells:[{cell_type:'code',source:['print(', '42)'],outputs:[{data:{'text/html':'EVIL_SCRIPT'}}]}]}))
  assert.equal(readNotebook(text)[0].source,'print(42)');assert.ok(!text.includes('EVIL_SCRIPT'))
  for(const text of ['{}','null','bad',JSON.stringify({nbformat:4,cells:[null]}),JSON.stringify({nbformat:4,cells:[{cell_type:'code',source:7}]})]) assert.throws(()=>normalizeNotebook(text))
})
test('assignment attachments contain actual notebook JSON and authored feedback source only', async () => {
  const project=base();project.files[1].text=writeNotebook([{type:'code',source:'answer=42'},{type:'markdown',source:'관찰 기록'}])
  const files=createStudioAttachments(project,{paths:['notebook.ipynb','main.py']})
  assert.equal(files[0].type,'application/x-ipynb+json');assert.equal(files[0].name,'수학 노트/notebook.ipynb')
  const notebook=await files[0].text();assert.equal(JSON.parse(notebook).cells.length,2)
  assert.match(notebookSourceText(notebook),/answer=42/);assert.match(notebookSourceText(notebook),/관찰 기록/)
  project.files[1].text=writeNotebook();assert.equal(JSON.parse(await files[0].text()).cells.length,2)
  assert.equal(await files[1].text(),'print("original")')
})

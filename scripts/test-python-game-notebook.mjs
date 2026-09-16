import assert from 'node:assert/strict'
import { notebookCells, editNotebookCell, joinNotebookCells, importNotebook, exportNotebook } from '../src/components/PythonGameStudio/notebookModel.mjs'
const original = 'text = """\n# %%\ninside string\n"""\n# %%\ntext\n'
assert.equal(notebookCells(original).length, 2)
assert.equal(notebookCells(original)[1].line, 6)
assert.equal(editNotebookCell(original, 1, 'text.upper()'), original.slice(0, original.lastIndexOf('text\n')) + 'text.upper()')
const cells = [{type:'code', source:'x=41\n'}, {type:'markdown',source:'# 제목\n**관찰**\n'}, {type:'code',source:'x+1\n'}]
const source=joinNotebookCells(cells)
assert.deepEqual(notebookCells(source).map(({type,source})=>({type,source})),cells)
assert.deepEqual(notebookCells(importNotebook(exportNotebook(source))).map(({type,source})=>({type,source})),cells)
assert.throws(()=>importNotebook('{"nbformat":3,"cells":[]}'))
const imported=importNotebook(JSON.stringify({nbformat:4,cells:[{cell_type:'code',source:['x=1\n','print(x)'],outputs:[{data:{'text/html':'<script>alert(1)</script>'}}]}]}))
assert.ok(!imported.includes('<script>'))
assert.ok(imported.includes('print(x)'))
console.log('PASS notebook cell boundaries, multiline strings, edits, Markdown roundtrip, ipynb source-only import/export')

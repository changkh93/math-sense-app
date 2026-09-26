import assert from 'node:assert/strict'
import { setTimeout as delay } from 'node:timers/promises'
import { JSDOM } from 'jsdom'
import { Compartment, EditorState } from '@codemirror/state'
import { EditorView, activateHover, keymap } from '@codemirror/view'
import { history, undo } from '@codemirror/commands'
import { python } from '@codemirror/lang-python'
import { studioSpelling, refreshStudioSpelling } from '../src/components/PythonWorld/studioSpelling.js'
import { codeTraceLanguageTools } from '../src/components/Space/codeTraceLanguageTools.js'

const dom = new JSDOM('<!doctype html><body></body>', { pretendToBeVisual: true })
for (const key of ['window', 'Window', 'document', 'Node', 'Element', 'MutationObserver', 'HTMLElement', 'requestAnimationFrame', 'cancelAnimationFrame', 'getComputedStyle']) {
  globalThis[key] = dom.window[key]
}
dom.window.Range.prototype.getClientRects = () => []
dom.window.Range.prototype.getBoundingClientRect = () => ({ left: 0, right: 0, top: 0, bottom: 0 })
const errors = []
dom.window.addEventListener('error', event => { errors.push(event.error); event.preventDefault() })
let project = { path: 'notebook.ipynb', files: [], prefix: 'import pygame\nwindow = pygame.display.set_mode((800, 600))\n' }
const spelling = studioSpelling(() => project)
const permissions = new Compartment()
const view = new EditorView({ parent: document.body, state: EditorState.create({
  doc: 'window.bilt(image)', extensions: [python(), history(), spelling, permissions.of([])],
}) })
const names = () => [...view.dom.querySelectorAll('.cm-studio-spelling')].map(element => element.textContent)
const fix = () => view.state.facet(keymap).flat().find(binding => binding.key === 'Alt-Enter').run(view)
async function tooltipButton() {
  activateHover(view, 9, 1, { tooltip: spelling[2] })
  await delay(0)
  const tooltip = view.state.field(spelling[2].active)[0]
  assert.ok(tooltip, 'spelling tooltip opens')
  return tooltip.create(view).dom.querySelector('button')
}
try {
  await delay(450)
  assert.deepEqual(names(), ['bilt'])
  const stale = await tooltipButton()

  // Changing an earlier cell invalidates the later cell without a document edit.
  project = { ...project, prefix: 'window = unknown_object\n' }
  view.dispatch({ effects: refreshStudioSpelling.of(null) })
  assert.deepEqual(names(), [])
  stale.click()
  assert.equal(view.state.doc.toString(), 'window.bilt(image)')
  await delay(450)
  assert.deepEqual(names(), [])

  project = { ...project, prefix: 'import pygame\nwindow = pygame.Surface((10, 10))\n' }
  view.dispatch({ effects: refreshStudioSpelling.of(null) })
  await delay(450)
  assert.deepEqual(names(), ['bilt'])
  view.dispatch({ selection: { anchor: 9 } })
  assert.equal(fix(), true)
  assert.equal(view.state.doc.toString(), 'window.blit(image)')
  assert.equal(undo(view), true)
  assert.equal(view.state.doc.toString(), 'window.bilt(image)')

  await delay(450)
  const beforeReadonly = await tooltipButton()
  view.dispatch({ effects: permissions.reconfigure([EditorState.readOnly.of(true), EditorView.editable.of(false)]) })
  beforeReadonly.click()
  assert.equal(fix(), false)
  assert.equal(view.state.doc.toString(), 'window.bilt(image)')

  view.dispatch({ effects: permissions.reconfigure([]) })
  await delay(450)
  const beforeDeletion = await tooltipButton()
  view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: '' } })
  beforeDeletion.click()
  assert.equal(view.state.doc.toString(), '')

  const codeTraceHost = document.createElement('div')
  document.body.append(codeTraceHost)
  const codeTraceView = new EditorView({ parent: codeTraceHost, state: EditorState.create({
    doc: 'pritn("hello")',
    extensions: [python(), history(), codeTraceLanguageTools()],
  }) })
  await delay(450)
  assert.deepEqual(
    [...codeTraceView.dom.querySelectorAll('.cm-studio-spelling')].map(element => element.textContent),
    ['pritn'],
    'CODE TRACE uses the same spelling diagnostics as Code Studio',
  )
  codeTraceView.dispatch({ selection: { anchor: 2 } })
  const codeTraceFix = codeTraceView.state.facet(keymap).flat().find(binding => binding.key === 'Alt-Enter')
  assert.equal(codeTraceFix.run(codeTraceView), true)
  assert.equal(codeTraceView.state.doc.toString(), 'print("hello")')
  codeTraceView.destroy()
  codeTraceHost.remove()

  assert.deepEqual(errors, [])
  console.log('Code Studio and CODE TRACE spelling regressions passed')
} finally {
  view.destroy()
  dom.window.close()
}

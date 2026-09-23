import { Decoration, EditorView, ViewPlugin, hoverTooltip, keymap } from '@codemirror/view'
import { StateEffect, StateField } from '@codemirror/state'
import { isolateHistory } from '@codemirror/commands'
import { createStudioAnalyzer } from './studioCompletionModel.js'
import { findStudioSpelling } from './studioSpellingModel.js'

export const refreshStudioSpelling = StateEffect.define()

export function studioSpelling(getProject) {
  const analyzer = createStudioAnalyzer(() => getProject() || {})
  const setIssues = StateEffect.define()
  const issueField = StateField.define({
    create: () => [],
    update(issues, transaction) {
      if (transaction.docChanged || transaction.reconfigured || transaction.effects.some(effect => effect.is(refreshStudioSpelling))) return []
      const replacement = transaction.effects.find(effect => effect.is(setIssues))
      return replacement ? replacement.value : issues
    },
    provide: field => EditorView.decorations.from(field, issues => Decoration.set(issues.map(issue => Decoration.mark({
      class: 'cm-studio-spelling',
      attributes: { title: `혹시 ${issue.suggestion}인가요? · Alt+Enter로 바꾸기` },
    }).range(issue.from, issue.to)))),
  })
  const plugin = ViewPlugin.fromClass(class {
    constructor(view) {
      this.schedule(view)
    }

    update(update) {
      if (!update.docChanged && !update.transactions.some(transaction => transaction.reconfigured || transaction.effects.some(effect => effect.is(refreshStudioSpelling)))) return
      this.schedule(update.view)
    }

    schedule(view) {
      clearTimeout(this.timer)
      if (view.state.readOnly || !view.state.facet(EditorView.editable)) return
      this.timer = setTimeout(() => {
        if (this.destroyed) return
        const issues = findStudioSpelling(view.state.doc.toString(), getProject() || {}, analyzer)
        view.dispatch({ effects: setIssues.of(issues) })
      }, 350)
    }

    destroy() {
      this.destroyed = true
      clearTimeout(this.timer)
    }
  })

  function applyFix(view, issue) {
    // Hover content can outlive the source document, project context or edit
    // permissions. Only a diagnostic still held by this editor may change it.
    if (!issue || view.state.readOnly || !view.state.facet(EditorView.editable) || !view.state.field(issueField).includes(issue)) return false
    if (issue.to > view.state.doc.length || view.state.sliceDoc(issue.from, issue.to) !== issue.actual) return false
    view.dispatch({ changes: { from: issue.from, to: issue.to, insert: issue.suggestion },
      selection: { anchor: issue.from + issue.suggestion.length }, userEvent: 'input.complete', annotations: isolateHistory.of('full') })
    view.focus()
    return true
  }

  return [issueField, plugin, hoverTooltip((view, pos) => {
    const issue = view.state.field(issueField).find(item => item.from <= pos && pos <= item.to)
    if (!issue) return null
    return { pos: issue.from, end: issue.to, above: true, create() {
      const dom = document.createElement('div')
      dom.className = 'cm-studio-spelling-tooltip'
      const label = document.createElement('span')
      label.textContent = `혹시 ${issue.suggestion}인가요?`
      const button = document.createElement('button')
      button.type = 'button'
      button.textContent = '이 철자로 바꾸기'
      button.title = 'Alt+Enter'
      button.setAttribute('aria-label', `${issue.suggestion}로 바꾸기 (Alt+Enter)`)
      button.addEventListener('mousedown', event => event.preventDefault())
      button.addEventListener('click', () => {
        applyFix(view, issue)
      })
      dom.append(label, button)
      return { dom }
    } }
  }, { hoverTime: 150, hideOnChange: true,
    hideOn: transaction => transaction.reconfigured || transaction.effects.some(effect => effect.is(refreshStudioSpelling)) }),
  keymap.of([{ key: 'Alt-Enter', run: view => {
    const selection = view.state.selection.main
    if (!selection.empty) return false
    return applyFix(view, view.state.field(issueField).find(issue => issue.from <= selection.head && selection.head <= issue.to))
  } }]), EditorView.theme({
    '.cm-studio-spelling': { textDecoration: 'underline wavy #ffbd6d', textUnderlineOffset: '3px', textDecorationThickness: '1.5px' },
    '.cm-studio-spelling-tooltip': { display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', font: '12px/1.5 system-ui', color: '#fce0b7', background: '#1d293b', border: '1px solid #906b42', borderRadius: '7px' },
    '.cm-studio-spelling-tooltip button': { padding: '4px 7px', border: '1px solid #906b42', borderRadius: '5px', color: '#14202b', background: '#ffcf89', cursor: 'pointer' },
  })]
}

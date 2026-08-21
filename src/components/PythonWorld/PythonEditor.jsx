import { useEffect, useRef } from 'react'
import { EditorState, StateEffect, StateField } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { python } from '@codemirror/lang-python'
import { EditorView, Decoration, keymap, lineNumbers, highlightActiveLineGutter } from '@codemirror/view'

const setExecutionLine = StateEffect.define()

const executionLineField = StateField.define({
  create: () => Decoration.none,
  update(decorations, transaction) {
    decorations = decorations.map(transaction.changes)
    for (const effect of transaction.effects) {
      if (!effect.is(setExecutionLine)) continue
      if (!effect.value) return Decoration.none
      const lineNumber = Math.max(1, Math.min(effect.value, transaction.state.doc.lines))
      const line = transaction.state.doc.line(lineNumber)
      return Decoration.set([
        Decoration.line({ class: 'python-editor-execution-line' }).range(line.from),
      ])
    }
    return decorations
  },
  provide: (field) => EditorView.decorations.from(field),
})

export default function PythonEditor({ value, onChange, activeLine, readOnly = false }) {
  const hostRef = useRef(null)
  const viewRef = useRef(null)
  const onChangeRef = useRef(onChange)
  const initialValueRef = useRef(value || '')
  const syncingValueRef = useRef(false)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    if (!hostRef.current) return undefined

    const view = new EditorView({
      parent: hostRef.current,
      state: EditorState.create({
        doc: initialValueRef.current,
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          history(),
          python(),
          executionLineField,
          EditorView.editable.of(!readOnly),
          EditorState.tabSize.of(4),
          keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap]),
          EditorView.updateListener.of((update) => {
            if (update.docChanged && !syncingValueRef.current) onChangeRef.current?.(update.state.doc.toString())
          }),
          EditorView.theme({
            '&': { height: '100%', backgroundColor: '#07101f', color: '#dcecff' },
            '.cm-scroller': { fontFamily: 'JetBrains Mono, SFMono-Regular, Consolas, monospace', overflow: 'auto' },
            '.cm-content': { padding: '14px 0', caretColor: '#56f1d5' },
            '.cm-gutters': { backgroundColor: '#0a1428', color: '#60718d', border: 'none' },
            '.cm-activeLineGutter': { backgroundColor: '#142743', color: '#b8d8ff' },
            '.cm-cursor': { borderLeftColor: '#56f1d5' },
            '.cm-selectionBackground': { backgroundColor: '#174b68 !important' },
          }),
        ],
      }),
    })
    viewRef.current = view
    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [readOnly])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current === (value || '')) return
    syncingValueRef.current = true
    try {
      view.dispatch({ changes: { from: 0, to: current.length, insert: value || '' } })
    } finally {
      syncingValueRef.current = false
    }
  }, [value])

  useEffect(() => {
    viewRef.current?.dispatch({ effects: setExecutionLine.of(activeLine || 0) })
  }, [activeLine])

  return <div className="python-editor-host" ref={hostRef} aria-label="Python 코드 편집기" />
}

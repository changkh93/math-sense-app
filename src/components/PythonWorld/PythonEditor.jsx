import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { Compartment, EditorState, StateEffect, StateField } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { python } from '@codemirror/lang-python'
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
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

const PythonEditor = forwardRef(function PythonEditor({ value, onChange, activeLine, readOnly = false }, ref) {
  const hostRef = useRef(null)
  const viewRef = useRef(null)
  const onChangeRef = useRef(onChange)
  const syncingValueRef = useRef(false)
  const editableCompartmentRef = useRef(new Compartment())

  useImperativeHandle(ref, () => ({
    insertSnippet: (insertText) => {
      const view = viewRef.current
      if (!view) return

      const { state } = view
      const { from, to } = state.selection.main
      const doc = state.doc.toString()

      let contentToInsert = insertText
      let replaceFrom = from
      let replaceTo = to

      // Intelligent quote handling:
      // If insertText is `"XYZ"` and user cursor is already inside `print("` or `"`:
      const charBefore = from > 0 ? doc[from - 1] : ''
      const charAfter = to < doc.length ? doc[to] : ''

      if (contentToInsert.startsWith('"') && contentToInsert.endsWith('"') && contentToInsert.length >= 2) {
        const inner = contentToInsert.slice(1, -1)
        if (charBefore === '"' && charAfter === '"') {
          // Cursor is between "" -> insert inner text only
          contentToInsert = inner
        } else if (charBefore === '"') {
          // Cursor is right after opening " -> insert inner text + closing "
          contentToInsert = `${inner}"`
        } else if (charAfter === '"') {
          // Cursor is right before closing " -> insert opening " + inner text
          contentToInsert = `"${inner}`
        }
      }

      view.dispatch({
        changes: { from: replaceFrom, to: replaceTo, insert: contentToInsert },
        selection: { anchor: replaceFrom + contentToInsert.length },
        scrollIntoView: true,
      })
      view.focus()
    },
    focus: () => {
      viewRef.current?.focus()
    },
  }), [])

  const initialValueRef = useRef(value || '')
  const initialReadOnlyRef = useRef(readOnly)

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
          closeBrackets(),
          executionLineField,
          editableCompartmentRef.current.of(EditorView.editable.of(!initialReadOnlyRef.current)),
          EditorState.tabSize.of(4),
          keymap.of([
            indentWithTab,
            ...closeBracketsKeymap,
            ...defaultKeymap,
            ...historyKeymap,
          ]),
          EditorView.updateListener.of((update) => {
            if (update.docChanged && !syncingValueRef.current) {
              onChangeRef.current?.(update.state.doc.toString())
            }
          }),
          EditorView.theme({
            '&': { height: '100%', backgroundColor: '#07101f', color: '#dcecff' },
            '.cm-scroller': {
              fontFamily: 'JetBrains Mono, SFMono-Regular, Consolas, monospace',
              overflow: 'auto',
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(73, 233, 255, 0.28) #071222',
            },
            '.cm-scroller::-webkit-scrollbar': { width: '6px', height: '6px' },
            '.cm-scroller::-webkit-scrollbar-track': { background: '#071222' },
            '.cm-scroller::-webkit-scrollbar-thumb': { background: '#1c3554', borderRadius: '4px' },
            '.cm-scroller::-webkit-scrollbar-thumb:hover': { background: '#2b517e' },
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
  }, [])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({
      effects: editableCompartmentRef.current.reconfigure(EditorView.editable.of(!readOnly)),
    })
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
})

export default PythonEditor

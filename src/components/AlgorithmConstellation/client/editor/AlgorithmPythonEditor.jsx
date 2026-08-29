import { forwardRef, useEffect, useRef } from 'react'
import { EditorState } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { python } from '@codemirror/lang-python'
import { indentUnit } from '@codemirror/language'
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter } from '@codemirror/view'

const AlgorithmPythonEditor = forwardRef(function AlgorithmPythonEditor(
  { value, onChange, readOnly = false, minHeight = '240px', activeSourceSpan = null },
  ref,
) {
  const hostRef = useRef(null)
  const viewRef = useRef(null)
  const onChangeRef = useRef(onChange)
  const syncingValueRef = useRef(false)

  const initialValueRef = useRef(value || '')

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    if (!hostRef.current) return undefined

    const state = EditorState.create({
      doc: initialValueRef.current,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        history(),
        python(),
        indentUnit.of('    '),
        closeBrackets(),
        EditorState.tabSize.of(4),
        keymap.of([
          indentWithTab,
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...historyKeymap,
        ]),
        EditorView.editable.of(!readOnly),
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !syncingValueRef.current) {
            onChangeRef.current?.(update.state.doc.toString())
          }
        }),
        EditorView.theme({
          '&': {
            height: '100%',
            minHeight,
            backgroundColor: 'rgba(2, 6, 23, 0.95)',
            color: '#e2e8f0',
            borderRadius: '10px',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            fontSize: '14px',
          },
          '.cm-scroller': {
            fontFamily: 'JetBrains Mono, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            lineHeight: '1.6',
            padding: '4px 0',
          },
          '.cm-content': {
            padding: '12px 14px',
            caretColor: '#00f0ff',
          },
          '.cm-gutters': {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            color: '#64748b',
            border: 'none',
            borderRight: '1px solid rgba(255, 255, 255, 0.08)',
            paddingRight: '6px',
          },
          '.cm-activeLineGutter': {
            backgroundColor: 'rgba(56, 189, 248, 0.15)',
            color: '#38bdf8',
          },
          '.cm-activeLine': {
            backgroundColor: 'rgba(56, 189, 248, 0.08)',
          },
          '.cm-cursor': {
            borderLeftColor: '#00f0ff',
            borderLeftWidth: '2px',
          },
          '.cm-selectionBackground': {
            backgroundColor: 'rgba(2, 132, 199, 0.35) !important',
          },
          '&.cm-focused': {
            outline: 'none',
            border: '1px solid rgba(0, 240, 255, 0.7)',
            boxShadow: '0 0 15px rgba(0, 240, 255, 0.25)',
          },
        }),
      ],
    })

    const view = new EditorView({
      state,
      parent: hostRef.current,
    })
    viewRef.current = view

    if (ref) {
      if (typeof ref === 'function') ref(view)
      else ref.current = view
    }

    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [minHeight, readOnly, ref])

  // Sync external code changes into editor
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current === (value || '')) return
    syncingValueRef.current = true
    try {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value || '' },
      })
    } finally {
      syncingValueRef.current = false
    }
  }, [value])

  useEffect(() => {
    const view = viewRef.current
    const startLine = activeSourceSpan?.startLine
    if (!view || !Number.isInteger(startLine) || startLine < 1 || startLine > view.state.doc.lines) return
    const endLineNumber = Math.min(activeSourceSpan?.endLine || startLine, view.state.doc.lines)
    const startLineInfo = view.state.doc.line(startLine)
    const endLineInfo = view.state.doc.line(endLineNumber)
    view.dispatch({
      selection: { anchor: startLineInfo.from, head: endLineInfo.to },
      effects: EditorView.scrollIntoView(startLineInfo.from, { y: 'center' }),
    })
  }, [activeSourceSpan])

  return (
    <div
      ref={hostRef}
      style={{ width: '100%', overflow: 'hidden', borderRadius: '10px' }}
      aria-label="Python Code Editor"
    />
  )
})

export default AlgorithmPythonEditor

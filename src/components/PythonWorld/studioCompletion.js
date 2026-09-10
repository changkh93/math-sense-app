import { autocompletion, acceptCompletion, startCompletion, snippetCompletion, pickedCompletion } from '@codemirror/autocomplete'
import { globalCompletion } from '@codemirror/lang-python'
import { indentUnit, indentOnInput } from '@codemirror/language'
import { StateField } from '@codemirror/state'
import { EditorView, keymap, showTooltip } from '@codemirror/view'
import { createStudioAnalyzer } from './studioCompletionModel.js'

const snippets = [
  snippetCompletion('for ${item} in ${items}:\n\t${pass}', { label: 'for', detail: '목록 반복', info: '목록의 값을 하나씩 꺼냅니다. Tab으로 빈칸 사이를 이동하세요.', type: 'keyword' }),
  snippetCompletion('for ${i} in range(${10}):\n\t${pass}', { label: 'for range', detail: '횟수 반복', info: '정해진 횟수만큼 반복합니다.', type: 'keyword' }),
  snippetCompletion('if ${condition}:\n\t${pass}', { label: 'if', detail: '조건문', info: '조건이 참일 때 실행합니다.', type: 'keyword' }),
  snippetCompletion('elif ${condition}:\n\t${pass}', { label: 'elif', detail: '추가 조건', type: 'keyword' }),
  snippetCompletion('else:\n\t${pass}', { label: 'else', detail: '그 외의 경우', type: 'keyword' }),
  snippetCompletion('while ${condition}:\n\t${pass}', { label: 'while', detail: '조건 반복', info: '조건이 참인 동안 반복합니다. 종료 조건을 확인하세요.', type: 'keyword' }),
  snippetCompletion('def ${name}(${parameters}):\n\t${pass}', { label: 'def', detail: '함수 만들기', type: 'keyword' }),
  snippetCompletion('__init__(self, ${parameters}):\n\t${pass}', { label: '__init__', detail: '객체 초기화 메서드 (def 뒤에서 사용)', type: 'method' }),
  snippetCompletion('class ${Name}:\n\tdef __init__(self):\n\t\t${pass}', { label: 'class', detail: '클래스 만들기', type: 'keyword' }),
  snippetCompletion('try:\n\t${pass}\nexcept ${Exception} as ${error}:\n\tprint(error)', { label: 'try', detail: '오류 처리', type: 'keyword' }),
]
function applyCall(view, completion, from, to) {
  // Never duplicate an existing opening parenthesis when completing a name.
  const existing = /^\s*\(/.test(view.state.sliceDoc(to, to + 12))
  const insert = completion.label + (existing ? '' : '()')
  view.dispatch({ changes: { from, to, insert }, selection: { anchor: from + completion.label.length + (existing ? 0 : 1) }, annotations: pickedCompletion.of(completion), userEvent: 'input.complete' })
}
export function studioCompletion(getProject) {
  const analyzer = createStudioAnalyzer(getProject)
  const path = () => getProject()?.path || 'main.py'
  const source = context => {
    const result = analyzer.complete(context.state.doc.toString(), context.pos, path(), context.explicit)
    if (!result) return null
    let options = result.options
    if (result.global) {
      const defaults = globalCompletion(context)?.options || []
      const merged = new Map(defaults.map(c => [c.label, c]))
      for (const c of options) merged.set(c.label, c)
      for (const c of snippets) if (!options.some(o => o.label === c.label && o.boost)) merged.set(c.label, c)
      options = [...merged.values()]
    }
    return {
      from: result.from,
      options: options.map(option => ({ ...option, info: [option.signature, option.info].filter(Boolean).join('\n'),
        apply: option.apply || (!result.importing && !result.string && option.signature ? applyCall : undefined) })),
      validFor: result.string ? /^[^'"\n]*$/ : /^[\p{L}\p{N}_]*$/u,
    }
  }
  const signature = state => {
    if (!state.selection.main.empty) return null
    const result = analyzer.signature(state.doc.toString(), state.selection.main.head, path())
    if (!result) return null
    return { pos: result.pos, above: true, create() {
      const dom = document.createElement('div'); dom.className = 'pgs-signature-help'
      const code = document.createElement('code'); code.textContent = result.signature
      const description = document.createElement('div'); description.textContent = result.info || ''
      const argument = document.createElement('small'); argument.textContent = `${result.argument}번째 인자 입력 중`
      dom.append(code, description, argument)
      return { dom }
    } }
  }
  const signatureField = StateField.define({
    create: signature,
    update(value, transaction) { return transaction.docChanged || transaction.selection ? signature(transaction.state) : value },
    provide: field => showTooltip.from(field),
  })
  return [
    indentUnit.of('    '), indentOnInput(),
    autocompletion({ override: [source], activateOnTyping: true, activateOnTypingDelay: 100, interactionDelay: 0, maxRenderedOptions: 60, defaultKeymap: true, closeOnBlur: true }),
    keymap.of([{ key: 'Tab', run: acceptCompletion }, { key: 'Ctrl-Space', run: startCompletion }, { key: 'Alt-/', run: startCompletion }]),
    signatureField,
    EditorView.theme({
      '.cm-tooltip': { backgroundColor: '#142238', color: '#e2edff', border: '1px solid #416078', borderRadius: '8px', boxShadow: '0 8px 24px #0006', maxWidth: 'min(540px, 90vw)' },
      '.cm-tooltip-autocomplete > ul': { fontFamily: 'inherit', maxHeight: '260px', minWidth: '230px' },
      '.cm-tooltip-autocomplete > ul > li': { padding: '5px 9px' },
      '.cm-tooltip-autocomplete > ul > li[aria-selected]': { backgroundColor: '#225b65', color: '#fff' },
      '.cm-completionLabel': { color: '#e3f5ff' }, '.cm-completionDetail': { color: '#a6c6d6', marginLeft: '12px', fontStyle: 'normal', fontSize: '11px' },
      '.cm-completionInfo': { padding: '10px', whiteSpace: 'pre-wrap', lineHeight: '1.6', fontFamily: 'system-ui', maxWidth: '320px' },
      '.pgs-signature-help': { padding: '8px 12px', maxWidth: 'min(500px, 85vw)', whiteSpace: 'pre-wrap', font: '12px/1.6 system-ui' },
      '.pgs-signature-help code': { color: '#8ff1d2' }, '.pgs-signature-help small': { color: '#9ab4c8' },
      '.cm-snippetField': { backgroundColor: '#275d6960', outline: '1px solid #8ff1d2' },
    }),
  ]
}

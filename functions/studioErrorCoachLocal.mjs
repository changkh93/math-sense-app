// Local-only diagnosis: no network, execution, or persistent student-code storage.
// This small lexer is deliberately conservative; it is not a Python parser.
function tokens(source) {
  const out = []
  let i = 0, line = 1
  while (i < source.length) {
    const c = source[i]
    if (c === '\n') { line++; i++; continue }
    if (/\s/.test(c)) { i++; continue }
    if (c === '#') { while (i < source.length && source[i] !== '\n') i++; continue }
    const start = i, row = line
    if (c === '"' || c === "'") {
      const quote = source.slice(i, i + 3) === c.repeat(3) ? c.repeat(3) : c
      i += quote.length
      let closed = false
      while (i < source.length) {
        if (source[i] === '\\') { if (source[i + 1] === '\n') line++; i += 2; continue }
        if (source.slice(i, i + quote.length) === quote) { i += quote.length; closed = true; break }
        if (source[i] === '\n') line++
        i++
      }
      out.push({ kind: 'string', value: '', start, end: i, line: row, closed })
    } else {
      const name = source.slice(i).match(/^[\p{L}_][\p{L}\p{N}_]*/u)
      const number = source.slice(i).match(/^\d+(?:\.\d+)?/)
      const value = name?.[0] || number?.[0] || c
      i += value.length
      out.push({ kind: name ? 'name' : number ? 'number' : 'symbol', value, start, end: i, line: row })
    }
  }
  return out
}
const feedback = (title, action, check, example = '') => ({ guide: [title, action, check], example, specific: true })
const shortName = value => value?.length <= 40 ? value : '해당 이름'

export function diagnoseLocalError(error, source = '', mode = 'file') {
  if (!source || source.length > 250000) return null
  const lines = source.split('\n'), message = error.message || ''
  // Never diagnose the current notebook cell as an earlier function definition.
  if (mode === 'notebook' && error.path?.endsWith('.ipynb') && (error.sameFileFrames > 1 || error.line > lines.length)) return null
  const line = lines[error.line - 1] || ''
  const again = '한 곳만 고친 뒤 다시 실행해 보세요. 오류가 사라졌는지 결과를 확인해요.'
  if (error.type === 'TabError') return feedback('들여쓰기에 Tab과 공백이 섞여 있어요.', '오류 줄과 같은 묶음의 줄 앞부분을 지우고, 공백 4칸씩으로 다시 맞춰 보세요.', '겉으로 나란해 보여도 Tab과 공백은 다를 수 있어요. 같은 방법으로 들여써 주세요.')
  if (error.type === 'IndentationError') {
    if (/expected an indented block/.test(message)) return feedback('콜론(:) 다음에 실행할 코드가 안쪽으로 들어가 있지 않아요.', 'if, for, while, def 등의 바로 다음 줄을 공백 4칸 들여써 주세요.', '같은 조건이나 반복 안에서 실행할 줄은 들여쓰기 깊이가 같아야 해요.', 'if True:\n    print("안녕")')
    if (/unexpected indent/.test(message)) return feedback('이 줄 앞에 필요 없는 들여쓰기가 있어요.', '이 줄이 조건문·반복문·함수 안에 속하는지 확인하고, 아니라면 줄 앞의 공백을 지워 주세요.', again)
    return feedback('이 줄의 들여쓰기 깊이가 앞의 묶음과 맞지 않아요.', '같은 묶음에 속한 줄과 시작 위치를 맞춰 주세요. 보통 한 단계마다 공백 4칸을 써요.', again)
  }
  if (error.type === 'SyntaxError') {
    if (/unterminated.*string|EOL while scanning string/.test(message)) return feedback('문자열을 시작한 따옴표가 닫히지 않았어요.', '글자의 끝에 시작할 때와 같은 따옴표를 넣어 주세요. 작은따옴표와 큰따옴표를 서로 짝지으면 안 돼요.', again, 'print("안녕")')
    const unclosed = message.match(/(['"])([([{])\1 was never closed/)
    if (unclosed) {
      const close = { '(': ')', '[': ']', '{': '}' }[unclosed[2]]
      return feedback(`여는 괄호 ${unclosed[2]}에 맞는 닫는 괄호 ${close}가 없어요.`, `표시된 줄에서 시작한 괄호를 따라가며 ${close}를 어디에 넣을지 확인해 주세요. 여러 줄에 걸쳐 닫을 수도 있어요.`, again)
    }
    if (/does not match opening parenthesis|unmatched/.test(message)) return feedback('여는 괄호와 닫는 괄호의 짝이 맞지 않아요.', '소괄호 (), 대괄호 [], 중괄호 {}가 같은 종류끼리 짝을 이루는지 확인해 주세요. 닫는 괄호가 하나 더 있을 수도 있어요.', again)
    if (/expected ':'/.test(message)) return feedback('이 문장 끝에 콜론(:)이 필요해요.', 'if, elif, else, for, while, def, class 같은 문장은 조건이나 이름 뒤에 :을 붙여 주세요.', '다음 줄의 실행할 코드는 공백 4칸 들여써 주세요.', 'if score > 0:\n    print(score)')
    const ts = tokens(source), row = ts.filter(t => t.line === error.line)
    for (let n = 0; n < row.length - 1; n++) {
      const left = row[n], right = row[n + 1]
      // A closed string followed by a name is not an implicit string join.
      // Exclude Python keywords (e.g. "x" if ready else "y") and f-string prefixes.
      const prefixed = n > 0 && row[n - 1].end === left.start && /^(?:f|rf|fr)$/i.test(row[n - 1].value)
      if (left.kind === 'string' && left.closed && !prefixed && right.kind === 'name' && !/^(and|or|if|else|for|in|is|not|as|async|await)$/.test(right.value)) {
        const name = shortName(right.value)
        return feedback(`따옴표로 닫은 문자열 바로 뒤에 ${name}가 붙어 있어요. 두 값을 이렇게 이어 쓸 수는 없어요.`, `${name}를 실수로 입력했다면 지워 주세요. 변수의 값도 함께 출력하려던 거라면 문자열과 ${name} 사이에 쉼표(,)를 넣어 주세요.`, `문자 자체를 출력하려면 따옴표 안에 넣어요. 변수로 쓸 때는 ${name}에 값을 먼저 넣었는지도 확인해 주세요.`, 'print("hello world")\n# 다른 값도 함께 출력하려면\na = 3\nprint("hello world", a)')
      }
    }
    if (/Perhaps you forgot a comma/.test(message)) return feedback('값과 값 사이의 구분이 빠졌을 수 있어요.', '함수 괄호나 목록 안에 여러 값을 넣었다면 사이에 쉼표(,)가 있는지 확인해 주세요. 불필요한 글자를 입력한 것은 아닌지도 살펴봐요.', '쉼표가 필요한지는 무엇을 하려던 코드인지에 따라 달라요. 문자열끼리는 쉼표 없이 이어 쓰는 문법도 있어요.', 'print("점수", 10)\nnumbers = [1, 2, 3]')
    if (/^\s*import\s+\S+\s+import\s/.test(line)) return feedback('import를 두 번 이어 쓴 문장은 사용할 수 없어요.', '모듈에서 이름을 꺼내려면 from 모듈 import 이름 순서로 써 주세요.', '거북이 수업에서 Turtle 클래스를 쓰려면 아래 문장을 확인해 주세요.', 'from ColabTurtlePlus.Turtle import *')
    if (/'(?:return|break|continue)' outside/.test(message)) return feedback('이 명령을 사용할 수 있는 위치가 아니에요.', 'return은 def로 만든 함수 안에서, break와 continue는 for·while 반복문 안에서 사용해 주세요.', '해당 묶음 안에 들여써져 있는지 확인해 주세요.')
    return null
  }
  if (error.type === 'NameError') {
    const missing = message.match(/name ['"]([^'"]+)['"] is not defined/)?.[1]
    if (!missing) return null
    const name = shortName(missing)
    return feedback(`${name}라는 이름에 담긴 값을 찾지 못했어요.`, `${name}에 값을 넣는 줄이 먼저 실행됐는지, 이름의 철자와 대소문자가 같은지 확인해 주세요.`, mode === 'notebook' ? '다른 셀에서 만든 변수라면 그 셀부터 실행하세요. 글자 자체를 출력하려면 따옴표로 감싸 주세요.' : '글자 자체를 출력하려면 따옴표로 감싸 주세요. 변수라면 사용하기 전에 값을 넣어 주세요.')
  }
  if (error.type === 'TypeError' && (/can only concatenate str/.test(message) || (/unsupported operand type.*for \+/.test(message) && /'str'/.test(message)))) return feedback('글자와 숫자를 그대로 더하려고 했어요.', '계산하려면 숫자 모양의 글자를 int() 또는 float()로 바꾸세요. 함께 보여주려면 print() 안에서 쉼표로 나눠 주세요.', '더하려는 것인지, 이어서 보여주려는 것인지 먼저 정해요.', 'print("점수", 10)\nprint(int("10") + 2)')
  if (error.type === 'TypeError' && /'module' object is not callable/.test(message)) return feedback('함수나 클래스 대신 모듈에 괄호()를 붙였어요.', 'import한 문장과 괄호 앞의 이름을 확인해 주세요. 모듈은 기능을 담은 상자이고, 그 안의 함수나 클래스를 호출해야 해요.', /ColabTurtlePlus/.test(source) ? 'Turtle()을 만들려면 from ColabTurtlePlus.Turtle import *로 Turtle 클래스를 불러오세요.' : '자동 추천에서 모듈 안의 함수나 클래스 이름을 찾아보세요.')
  if (error.type === 'ValueError' && /invalid literal for int/.test(message)) return feedback('int()에 정수로 바꿀 수 없는 글자가 들어왔어요.', '입력에 글자나 소수점이 섞였거나, 아무것도 입력하지 않았는지 확인해 주세요. 정수를 원하면 10처럼 숫자만 입력해요.', '소수를 받으려는 코드라면 float()를 사용해요.', 'age = int(input("나이: "))')
  if (error.type === 'FileNotFoundError') return feedback('코드에서 열려고 한 파일이 프로젝트에서 발견되지 않았어요.', '파일 탐색기에 해당 파일을 올렸는지 확인하고, 폴더 이름·파일 이름·확장자를 코드와 똑같이 맞춰 주세요.', '하위 폴더에 있다면 폴더까지 적어요. 예: data/weather.csv 또는 images/hero.png.')
  return null
}

import test from 'node:test'
import assert from 'node:assert/strict'
import { localFeedback, parseError, makeCoachPayload } from './studioErrorCoachPolicy.mjs'
const error = (type, message, line = 1) => parseError(`  File "/tmp/studio/main.py", line ${line}\n${type}: ${message}`)
const syntax = message => error('SyntaxError', message)

test('reported string/name typo gives immediate alternatives and an example without executing code', () => {
  const feedback = localFeedback(syntax('invalid syntax. Perhaps you forgot a comma?'), 'print("hello world"a)')
  assert.match(feedback.guide[0], /문자열 바로 뒤에 a/)
  assert.match(feedback.guide[1], /실수로 입력했다면 지워/)
  assert.match(feedback.guide[1], /쉼표/)
  assert.match(feedback.guide[2], /값을 먼저/)
  assert.match(feedback.example, /print\("hello world", a\)/)
  assert.equal(feedback.specific, true)
})

test('lexer handles escaped quotes, unicode names, comments and multiline strings', () => {
  assert.match(localFeedback(syntax('invalid syntax'), 'print("a\\\"b"점수)').guide[0], /바로 뒤에 점수/)
  for (const source of ['# print("hi"a)\n?', 'print("hi") # "x"a', 'text = """print("hi"a)"""', 'print("hi" if ok else "no")', 'print("hi" "world")', 'print(f"{value}"a)']) {
    assert.doesNotMatch(localFeedback(syntax('invalid syntax'), source).guide[0], /문자열 바로 뒤/)
  }
  const multiline = 'x = """hello\nworld"""\nprint("안녕"name)'
  assert.match(localFeedback(error('SyntaxError', 'invalid syntax', 3), multiline).guide[0], /바로 뒤에 name/)
})

test('syntax families use concrete actions instead of one generic syntax hint', () => {
  const cases = [
    ['unterminated string literal (detected at line 1)', 'print("hello)', /따옴표가 닫히지/, /같은 따옴표/],
    ["'(' was never closed", 'print(1', /닫는 괄호 \)/, /어디에 넣을지/],
    ["closing parenthesis ']' does not match opening parenthesis '('", 'print(1]', /짝이 맞지/, /같은 종류/],
    ["expected ':'", 'if True', /콜론/, /:을 붙여/],
    ['invalid syntax', 'import ColabTurtlePlus import *', /import를 두 번/, /from 모듈 import 이름/],
    ['invalid syntax. Perhaps you forgot a comma?', 'print(1 2)', /구분이 빠졌을/, /쉼표/],
  ]
  for (const [message, source, title, action] of cases) {
    const { guide } = localFeedback(syntax(message), source)
    assert.match(guide[0], title); assert.match(guide[1], action)
  }
})

test('indentation and runtime messages give next actions with mode-aware names', () => {
  assert.match(localFeedback(error('IndentationError', 'expected an indented block'), 'if True:\nprint(1)').guide[1], /공백 4칸/)
  assert.match(localFeedback(error('TabError', 'inconsistent use of tabs and spaces'), '\tprint(1)').guide[0], /Tab과 공백/)
  const name = error('NameError', "name 'socre' is not defined")
  assert.match(localFeedback(name, 'print(socre)', 'file').guide[0], /socre/)
  assert.doesNotMatch(localFeedback(name, 'print(socre)', 'file').guide.join(' '), /셀/)
  assert.match(localFeedback(name, 'print(socre)', 'notebook').guide[2], /셀부터 실행/)
  assert.match(localFeedback(error('ValueError', "invalid literal for int() with base 10: ''"), 'int(input())').guide[1], /아무것도 입력하지/)
  assert.match(localFeedback(error('TypeError', "'module' object is not callable"), 'from ColabTurtlePlus import *\nt=Turtle()').guide[2], /ColabTurtlePlus.Turtle/)
  assert.match(localFeedback(error('FileNotFoundError', '[Errno 2]'), 'open("data.csv")').guide[1], /파일 탐색기/)
})

test('ambiguous earlier notebook frames never diagnose unrelated active-cell tokens', () => {
  const e = parseError('  File "/tmp/studio/notebook.ipynb", line 1\n  File "/tmp/studio/notebook.ipynb", line 1\nSyntaxError: invalid syntax')
  assert.equal(localFeedback(e, 'print("hello"a)', 'notebook').specific, false)
  assert.equal(makeCoachPayload('print("hello"a)', e, 'notebook'), null)
})

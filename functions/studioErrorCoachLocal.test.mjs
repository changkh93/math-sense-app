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

test('missing import pieces are diagnosed using the failing statement, including aliases and comments', () => {
  const cases = [
    ['from ColabTurtlePlus.Turtle import', 'import-missing-target'],
    ['from ColabTurtlePlus.Turtle import   # 가져올 이름', 'import-missing-target'],
    ['from math import', 'import-missing-target'],
    ['import', 'import-missing-module'],
    ['from import Turtle', 'from-missing-module'],
    ['from math', 'from-missing-import'],
    ['import pandas as', 'import-missing-alias'],
    ['from math import sqrt as', 'import-missing-alias'],
    ['import *', 'import-star-without-from'],
  ]
  for (const [source, rule] of cases) {
    const result = localFeedback(syntax('invalid syntax'), source)
    assert.equal(result.ruleId, rule, source)
    assert.equal(result.confidence, 'high')
  }
  const result = localFeedback(syntax('invalid syntax'), 'from ColabTurtlePlus.Turtle import\n\nt = Turtle()\nt.forward(100)', 'notebook')
  assert.match(result.guide[1], /import 뒤에 \*/)
  assert.equal(result.example, 'from ColabTurtlePlus.Turtle import *')
  assert.doesNotMatch(result.guide.join(' '), /if, for|콜론/)
})

test('valid imports, strings, comments and continuation context do not trigger missing-import diagnosis', () => {
  for (const source of [
    'from math import sqrt', 'from ColabTurtlePlus.Turtle import *', 'import pandas as pd',
    'from math import (sqrt,\n cos)', '# from math import', 'text = "from math import"',
    'text = """from math import\nmore"""', 'print("import pandas as")',
  ]) assert.equal(localFeedback(syntax('invalid syntax'), source).ruleId, undefined, source)
  assert.equal(localFeedback(error('SyntaxError', 'invalid syntax', 2), 'values = (\nfrom math import').ruleId, undefined)
  assert.equal(localFeedback(error('SyntaxError', 'invalid syntax', 2), 'value = \\\nfrom math import').ruleId, undefined)
})

test('commented assignment gives local evidence without mistaking a multiline string for code', () => {
  const e = error('NameError', "name 'a' is not defined", 2)
  const result = localFeedback(e, '# a = 2\nprint(a)', 'notebook')
  assert.equal(result.ruleId, 'name-commented-assignment')
  assert.match(result.guide[0], /1번째 줄에서 #으로 주석/)
  assert.match(result.guide[1], /앞의 #을 지우고/)
  assert.equal(localFeedback(e, '# a == 2\nprint(a)').ruleId, undefined)
  assert.equal(localFeedback(error('NameError', "name 'a' is not defined", 4), 'text = """\n# a = 2\n"""\nprint(a)').ruleId, undefined)
})

test('AI grounding is computed only from complete minimized syntax evidence', async () => {
  const { groundedSyntaxContext } = await import('./studioErrorCoachPolicy.mjs')
  const payload = makeCoachPayload('from ColabTurtlePlus.Turtle import # private@example.com', syntax('invalid syntax'))
  const facts = groundedSyntaxContext(payload)
  assert.equal(facts.ruleId, 'import-missing-target')
  assert.ok(!JSON.stringify(facts).includes('private'))
  assert.equal(groundedSyntaxContext({ ...payload, line: 10, snippet: '10: from math import' }), null)
  assert.equal(groundedSyntaxContext({ ...payload, snippet: '1: from math import sqrt' }), null)
  assert.equal(groundedSyntaxContext({ ...payload, errorType: 'NameError' }), null)
})

test('constructor parentheses are diagnosed at creation rather than requesting an extra distance', () => {
  for (const [source, line] of [
    ['from ColabTurtlePlus.Turtle import *\n\nt = Turtle\nt.forward(100)', 4],
    ['import turtle as tt\nt = tt.Turtle\nt.forward(100)', 3],
    ['from turtle import Turtle as T\nbaby = T\nbaby.forward(100)', 3],
  ]) {
    const e = error('TypeError', "Turtle.forward() missing 1 required positional argument: 'distance'", line)
    const result = localFeedback(e, source, 'notebook')
    assert.equal(result.ruleId, 'constructor-not-called', source)
    assert.match(result.guide[1], /뒤에 \(\)를 붙여/)
    assert.match(result.guide[2], /숫자를 더 넣기보다/)
  }
  const e = error('TypeError', "Turtle.forward() missing 1 required positional argument: 'distance'", 3)
  const result = localFeedback(e, 'from turtle import Turtle\nt = Turtle()\nt.forward()')
  assert.equal(result.ruleId, 'call-missing-argument')
  assert.match(result.guide[1], /forward\(100\)/)
})

test('spelling candidates are drawn from known names and typed receivers', () => {
  const cases = [
    ['pritn(1)', 'NameError', "name 'pritn' is not defined", 1, 'print'],
    ['Print(1)', 'NameError', "name 'Print' is not defined", 1, 'print'],
    ['score = 10\nprint(socre)', 'NameError', "name 'socre' is not defined", 2, 'score'],
    ['점수 = 10\nprint(점수값)', 'NameError', "name '점수값' is not defined", 2, null],
    ['from turtle import Turtle\nt = Trutle()', 'NameError', "name 'Trutle' is not defined", 2, 'Turtle'],
    ['from turtle import Turtle\nt = Turtle()\nt.foward(100)', 'AttributeError', "'Turtle' object has no attribute 'foward'", 3, 'forward'],
    ['import pygame as pg\npg.display.updat()', 'AttributeError', "module 'pygame.display' has no attribute 'updat'", 2, 'update'],
    ['import pandas as pd\npd.read_cvs("data.csv")', 'AttributeError', "module 'pandas' has no attribute 'read_cvs'", 2, 'read_csv'],
  ]
  for (const [source, type, message, line, candidate] of cases) {
    const result = localFeedback(error(type, message, line), source)
    if (candidate) { assert.match(result.guide[0], new RegExp(candidate)); assert.equal(result.confidence, 'likely') }
    else assert.equal(result.ruleId, undefined)
  }
})

test('do not guess constructor calls or spelling across rebinding, unknown objects or ambiguous candidates', () => {
  const cases = [
    ['from other import Turtle\nt = Turtle\nt.forward(100)', 3],
    ['from turtle import Turtle\nTurtle = something\nt = Turtle\nt.forward(100)', 4],
    ['from turtle import Turtle\nt = Turtle\nt = other\nt.forward(100)', 4],
    ['from turtle import Turtle\nif flag:\n t = Turtle\nt.forward(100)', 4],
  ]
  for (const [source, line] of cases) assert.notEqual(localFeedback(error('TypeError', "missing 1 required positional argument: 'distance'", line), source).ruleId, 'constructor-not-called')
  assert.equal(localFeedback(error('AttributeError', "object has no attribute 'foward'", 1), 'unknown.foward(100)').ruleId, undefined)
  assert.equal(localFeedback(error('NameError', "name 'cot' is not defined", 3), 'cat = 1\ncut = 2\nprint(cot)').ruleId, undefined)
  assert.equal(localFeedback(error('NameError', "name 'score' is not defined", 2), 'score = 1\nprint(score)').ruleId, undefined)
})

test('error minimization retains diagnostic identifiers but not literal values, and grounding survives', async () => {
  const { minimizeError, groundedSyntaxContext, validateCoachPayload } = await import('./studioErrorCoachPolicy.mjs')
  assert.equal(minimizeError("NameError: name 'pritn' is not defined"), "NameError: name 'pritn' is not defined")
  assert.ok(!minimizeError("KeyError: 'private_name'").includes('private_name'))
  assert.ok(!minimizeError("ValueError: name 'private_name' is not defined").includes('private_name'))
  assert.ok(!minimizeError("ValueError: invalid literal for int(): 'private@example.com'").includes('private@'))
  const source = 'from turtle import Turtle\nt = Turtle\nt.forward(100)'
  const e = error('TypeError', "Turtle.forward() missing 1 required positional argument: 'distance'", 3)
  const payload = validateCoachPayload(makeCoachPayload(source, e))
  assert.equal(groundedSyntaxContext(payload).ruleId, 'constructor-not-called')
  const typo = validateCoachPayload(makeCoachPayload('score = 10\nprint(socre)', error('NameError', "name 'socre' is not defined", 2)))
  assert.equal(groundedSyntaxContext(typo).ruleId, 'name-spelling')
})

test('module and imported class spelling survive privacy minimization', async () => {
  const { groundedSyntaxContext, validateCoachPayload } = await import('./studioErrorCoachPolicy.mjs')
  for (const [source, type, message, rule] of [
    ['import numppy as np', 'ModuleNotFoundError', "No module named 'numppy'", 'module-spelling'],
    ['from turtle import Trutle', 'ImportError', "cannot import name 'Trutle' from 'turtle'", 'import-spelling'],
  ]) {
    const e = error(type, message)
    assert.equal(localFeedback(e, source).ruleId, rule)
    assert.equal(groundedSyntaxContext(validateCoachPayload(makeCoachPayload(source, e))).ruleId, rule)
  }
})

test('common list and random method typos use source-supported receivers', () => {
  for (const [source, message, line, candidate] of [
    ['numbers = []\nnumbers.apend(1)', "'list' object has no attribute 'apend'", 2, 'append'],
    ['word = "hello"\nword.uper()', "'str' object has no attribute 'uper'", 2, 'upper'],
    ['import numpy as np\nnp.random.ranint(1, 10)', "module has no attribute 'ranint'", 2, 'randint'],
  ]) assert.match(localFeedback(error('AttributeError', message, line), source).guide[0], new RegExp(candidate))
})

test('indexed literals, conditional constructors and callbacks are not assumed to be instances', () => {
  assert.equal(localFeedback(error('AttributeError', "'int' object has no attribute 'apend'", 2), 'number = [1][0]\nnumber.apend(2)').ruleId, undefined)
  assert.equal(localFeedback(error('AttributeError', "object has no attribute 'foward'", 3), 'from turtle import Turtle\nt = Turtle() if ready else other\nt.foward(100)').ruleId, undefined)
  assert.notEqual(localFeedback(error('TypeError', "unrelated type error", 2), 'callback = print\ncallback(1)').ruleId, 'constructor-not-called')
})

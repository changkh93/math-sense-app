import { test } from 'node:test'
import assert from 'node:assert/strict'
import { makeCoachPayload, parseError } from './studioErrorCoachPolicy.mjs'
import { validateStructurePayload, renderStructure, STRUCTURE_WORDS, restoreCoachNames } from './studioCoachStructure.mjs'
const error = (type, message, line = 1, path = 'main.py') => parseError(`  File "/tmp/studio/${path}", line ${line}\n${type}: ${message}`)
const make = (source, e, mode) => makeCoachPayload(source, e, mode)
test('same identifiers keep identity and different identifiers stay different in code and error', () => {
  const p = make('철수 = 29\nprint(철수, 철수오타)', error('NameError', "name '철수오타' is not defined", 2))
  const r = renderStructure(p)
  assert.equal(r.snippet, '1: variable_1 = number_1\n2: print(variable_1, variable_2)')
  assert.equal(r.error, "NameError: name 'variable_2' is not defined")
  for (const v of ['철수', '29']) assert.ok(!JSON.stringify(p).includes(v))
})
test('lesson imports, aliases, constructor and function-call structure survive', () => {
  const source = 'from ColabTurtlePlus.Turtle import *\nt = Turtle\nt.forward(100)'
  const p = make(source, error('TypeError', "Turtle.forward() missing 1 required positional argument: 'distance'", 3))
  assert.match(renderStructure(p).snippet, /variable_1 = Turtle\n3: variable_1.forward\(number_1\)/)
  const pandas = make('import pandas as pd\ndata = pd.DataFrame({"이름": ["가상 학생"]})\nprint(missing)', error('NameError', "name 'missing' is not defined", 3))
  assert.match(renderStructure(pandas).snippet, /import pandas as variable_1/)
  assert.match(renderStructure(pandas).snippet, /variable_2 = variable_1.DataFrame/)
})
test('comments, multiline literals, numbers and paths never pass through', () => {
  const source = '# private marker\nsecret = """학교이름\nprivate@example.com\n01012345678"""\nfile = "data/학생.csv"\nphone = 123456789\nprint(missing)'
  const p = make(source, error('NameError', "name 'missing' is not defined", 7))
  const text = JSON.stringify([p, renderStructure(p)])
  for (const marker of ['private', '학교', '01012345678', '학생', '123456789', 'phone', 'secret']) assert.ok(!text.includes(marker), marker)
  assert.equal(p.rows.length, 7)
})
test('unterminated strings are removed but structured error retains the cause', () => {
  const p = make('print("private@example.com)', error('SyntaxError', 'unterminated string literal'))
  assert.match(renderStructure(p).error, /unterminated string/)
  assert.ok(!JSON.stringify(p).includes('private'))
})
test('literal relationships survive without actual values or executable-code claims', () => {
  const p = make('a = [100, 100, 200]\nb = ["yes", "yes", "no"]\nprint(c)', error('NameError', "name 'c' is not defined", 3))
  const r = renderStructure(p)
  assert.match(r.snippet, /number_1, number_1, number_2/)
  assert.match(r.snippet, /text_1.*text_1.*text_2/)
  assert.match(r.transformations, /NOT executable/)
})
test('value-sensitive errors and dynamic/string-interpolated code fail closed', () => {
  for (const type of ['ValueError', 'KeyError', 'IndexError', 'FileNotFoundError', 'ZeroDivisionError']) assert.equal(make('print(1)', error(type, 'private value')), null)
  for (const code of ['eval(secret)', 'getattr(t, name)', 'print(f"hi {student}")', 'print(r"path")', 'print(💥)']) assert.equal(make(code, error('NameError', "name 'secret' is not defined")), null)
})
test('window scans strings above it and ambiguous notebook frames block requests', () => {
  const source = 'a="""\n' + 'private@example.com\n'.repeat(15) + '"""\nprint(missing)'
  const p = make(source, error('NameError', "name 'missing' is not defined", 18))
  assert.ok(!JSON.stringify(p).includes('private'))
  const e = { ...error('NameError', "name 'missing' is not defined", 1, 'notebook.ipynb'), sameFileFrames: 2 }
  assert.equal(make('helper()', e, 'notebook'), null)
})
test('schema rejects raw text, legacy payloads, unknown words, invalid enum combinations and oversized tokens', () => {
  const p = make('print(missing)', error('NameError', "name 'missing' is not defined"))
  for (const changed of [{ version: 1 }, { source: 'SECRET' }, { name: ['v', 'private'] }, { reason: 'private' }, { errorType: 'SyntaxError' }, { rows: [[['w', STRUCTURE_WORDS.length]]] }, { rows: [[['p', -1]]] }, { rows: [[['q', 'secret']]] }, { rows: [[['v', 1, 'secret']]] }, { rows: [[['__proto__', 1]]] }, { rows: Array.from({ length: 14 }, () => []) }]) assert.throws(() => validateStructurePayload({ ...p, ...changed }))
  assert.deepEqual(validateStructurePayload(p), p)
})
test('student aliases cannot spoof reserved vocabulary or numeric placeholder identity', () => {
  const p = make('variable_1 = 2026\nnumber_1 = variable_1\nprint(unknown)', error('NameError', "name 'unknown' is not defined", 3))
  assert.match(renderStructure(p).snippet, /variable_1 = number_1\n2: variable_2 = variable_1/)
  assert.ok(!JSON.stringify(p).includes('2026'))
})

test('alias restoration is local-only and single-pass, including alias-shaped original names', () => {
  const aliases = Object.create(null)
  const p = makeCoachPayload('variable_2 = 5\n철수 = variable_2\nprint(missing)', error('NameError', "name 'missing' is not defined", 3), 'file', aliases)
  assert.equal(restoreCoachNames('variable_1, variable_2, variable_3', aliases), 'variable_2, 철수, missing')
  assert.ok(!JSON.stringify(p).includes('철수'))
  assert.equal(Object.keys(p).includes('aliases'), false)
})

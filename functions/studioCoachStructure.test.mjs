import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ERROR_TYPES, makeCoachPayload, parseError } from './studioErrorCoachPolicy.mjs'
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
test('every parsed error category can request structural advice without raw error prose', () => {
  for (const type of ERROR_TYPES) {
    const p = make('print(1)', error(type, 'PRIVATE_VALUE_01012345678'))
    assert.ok(p, type)
    assert.deepEqual(validateStructurePayload(p), p)
    const rendered = renderStructure(p)
    assert.ok(!JSON.stringify([p, rendered]).includes('PRIVATE_VALUE'))
    assert.ok(!rendered.error.includes('undefined'))
  }
})
test('dynamic calls and masked f-strings allow advice without executing or exposing them', () => {
  for (const code of ['eval("PRIVATE_CODE")', 'getattr(t, "PRIVATE_ATTRIBUTE")', 'print(f"PRIVATE_HUD {student}")']) {
    const p = make(code, error('NameError', "name 'student' is not defined"))
    assert.ok(p, code)
    assert.ok(!JSON.stringify([p, renderStructure(p)]).includes('PRIVATE_'))
  }
  assert.equal(make('print(💥)', error('SyntaxError', 'invalid character')), null)
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


test('HUD f-strings do not block unrelated method errors, and no contents leave the browser', () => {
  const source = [
    'class Game:',
    '    def draw(self):',
    '        print(f"PRIVATE_SCORE {self.score}")',
    '        print(fr"PRIVATE_PATH {self.level}")',
    '        print(r"PRIVATE_RAW")',
    '    def update(self):',
    '        self.chooes_new_wanted()',
    '    def choose_new_wanted(self):',
    '        pass',
  ].join('\n')
  const p = make(source, error('AttributeError', "'Game' object has no attribute 'chooes_new_wanted'. Did you mean: 'choose_new_wanted'?", 7))
  assert.ok(p)
  assert.equal(p.finding, 'attribute-spelling')
  assert.deepEqual(validateStructurePayload(p), p)
  const outbound = JSON.stringify([p, renderStructure(p)])
  for (const secret of ['PRIVATE_SCORE', 'PRIVATE_PATH', 'PRIVATE_RAW', 'self.score', 'self.level', 'chooes_new_wanted']) assert.ok(!outbound.includes(secret), secret)
  assert.equal(p.rows.length, 9)
})

test('formatted strings retain line offsets and mask escapes, formatting and double braces', () => {
  const source = 'text = f"""private\n{{literal}} {value!r:>{width}}\nprivate_end"""\nprint(missing)'
  const p = make(source, error('NameError', "name 'missing' is not defined", 4))
  assert.ok(p)
  assert.equal(p.rows.length, 4)
  assert.match(renderStructure(p).snippet, /4: print\(variable_1\)/)
  assert.ok(!JSON.stringify(p).includes('private'))
})

test('unsupported formatted expressions have specific reasons and never expose fragments', () => {
  for (const literal of [`f"{record['SECRET']}"`, 'f"{value # SECRET}"', 'f"unclosed {value"', 'f"stray } SECRET"', 'f"\\{value}"']) {
    const diagnostic = {}
    const p = makeCoachPayload(`text = ${literal}\nprint(missing)`, error('NameError', "name 'missing' is not defined", 2), 'file', {}, diagnostic)
    assert.equal(p, null, literal)
    assert.equal(diagnostic.reason, 'string-syntax')
  }
  const diagnostic = {}
  const p = makeCoachPayload('print(f"{missing}")', error('NameError', "name 'missing' is not defined"), 'file', {}, diagnostic)
  assert.ok(p)
  assert.equal(diagnostic.reason, undefined)
  assert.match(renderStructure(p).snippet, /print\(f"<hidden_expression_text_1>"\)/)
  assert.equal(p.name, null) // An alias must not fabricate visibility into the hidden expression.
})

test('common runtime failures retain actionable meanings but hide values, paths and exception text', () => {
  const cases = [
    ['amount = int("PRIVATE_INPUT")', 'ValueError', "invalid literal for int() with base 10: 'PRIVATE_INPUT'", 'number-conversion', /converted to a number/],
    ['a, b = [1, 2, 3]', 'ValueError', 'too many values to unpack (expected 2)', 'unpack-count', /unpacking/],
    ['print([1][3])', 'IndexError', 'list index out of range', 'index-range', /index/],
    ['print({}["PRIVATE_KEY"])', 'KeyError', "'PRIVATE_KEY'", 'missing-key', /key/],
    ['print(12 / 0)', 'ZeroDivisionError', 'division by zero', 'zero-division', /zero/],
    ['open("PRIVATE_PATH.csv")', 'FileNotFoundError', "[Errno 2] No such file or directory: 'PRIVATE_PATH.csv'", 'missing-file', /file/],
    ['print("PRIVATE_TEXT" + 1)', 'TypeError', 'can only concatenate str (not "int") to str', 'type-mismatch', /incompatible type/],
    ['print(None[0])', 'TypeError', "'NoneType' object is not subscriptable", 'not-subscriptable', /indexing/],
    ['list(1)', 'TypeError', "'int' object is not iterable", 'not-iterable', /iterated/],
    ['print(PRIVATE_ARG=1)', 'TypeError', "unexpected keyword argument 'PRIVATE_ARG'", 'unexpected-keyword', /keyword/],
    ['pygame.display.flip()', 'pygame.error', 'video system not initialized', 'pygame-video', /video system/],
    ['pygame.Surface((10, 10)).convert()', 'pygame.error', 'No video mode has been set', 'pygame-display', /display mode/],
    ['pygame.mixer.Sound("PRIVATE_SOUND.wav")', 'pygame.error', 'mixer not initialized', 'pygame-mixer', /mixer/],
    ['run()', 'RuntimeError', 'PRIVATE_RUNTIME_DETAIL', 'runtime-failure', /runtime operation/],
  ]
  for (const [source, type, message, reason, meaning] of cases) {
    for (const mode of ['file', 'notebook']) {
      const p = make(source, error(type, message), mode)
      assert.ok(p, `${type} in ${mode}`)
      assert.equal(p.reason, reason)
      assert.match(renderStructure(p).error, meaning)
      assert.ok(!JSON.stringify([p, renderStructure(p)]).includes('PRIVATE_'))
      assert.throws(() => validateStructurePayload({ ...p, errorType: 'SyntaxError' }))
    }
  }
})

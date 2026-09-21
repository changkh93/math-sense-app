import { test } from 'node:test'
import assert from 'node:assert/strict'
import { inspectBehavior, behaviorError } from './studioBehaviorCoach.mjs'
import { makeCoachPayload, localFeedback, parseError } from './studioErrorCoachPolicy.mjs'
import { renderStructure, validateStructurePayload } from './studioCoachStructure.mjs'

import { behaviorFixture } from './studioBehaviorCoach.fixtures.mjs'

test('behavior review distinguishes state mismatch and loop mapping without inventing an exception', () => {
  const findings = inspectBehavior(behaviorFixture)
  assert.deepEqual(findings.map(item => item.ruleId), ['state-field-mismatch', 'loop-type-image-mismatch'])
  assert.match(findings[0].explanation, /self.target_type/)
  assert.match(findings[0].explanation, /실행 오류가 나지 않을/)
  assert.match(findings[0].action, /다른 함수/)
  assert.match(findings[1].action, /의도라면/)
  for (const item of findings) assert.ok(behaviorFixture.split('\n')[item.line - 1])
})

test('fixed state update, unrelated attributes and separated classes are not diagnosed', () => {
  const fixed = behaviorFixture.replace('self.target = picked.type', 'self.target_type = picked.type')
  assert.ok(!inspectBehavior(fixed).some(item => item.ruleId === 'state-field-mismatch'))
  const separate = behaviorFixture.replace('    def choose(self):', 'class Other:\n    def choose(self):')
  assert.ok(!inspectBehavior(separate).some(item => item.ruleId === 'state-field-mismatch'))
  const helper = behaviorFixture.replace('self.target_image = picked.image', 'self.target_type = picked.type\n        self.target_image = picked.image')
  assert.ok(!inspectBehavior(helper).some(item => item.ruleId === 'state-field-mismatch'))
})

test('comments, quoted programs, ambiguous syntax and notebook context do not create findings', () => {
  assert.deepEqual(inspectBehavior(behaviorFixture.split('\n').map(line => '# ' + line).join('\n')), [])
  assert.deepEqual(inspectBehavior(`example = '''${behaviorFixture}'''`), [])
  assert.deepEqual(inspectBehavior(behaviorFixture, 'notebook'), [])
  assert.deepEqual(inspectBehavior(behaviorFixture + '\nexec(code)'), [])
  assert.deepEqual(inspectBehavior('x'.repeat(50001)), [])
  assert.deepEqual(inspectBehavior(behaviorFixture.replace('    def draw', '\tdef draw')), [])
})

test('an independent image or changed loop variable does not imply a mapping mismatch', () => {
  for (const source of [
    behaviorFixture.replace('f"{label}_monster.png"', '"single.png"'),
    behaviorFixture.replace('f"{label}_monster.png"', 'f"{{label}}_monster.png"'),
    behaviorFixture.replace('pygame.image.load(f"{label}_monster.png")', 'pygame.image.load("single.png"), f"{label}"'),
    behaviorFixture.replace('    for label', '    kind = 2\n    for label').replace('        monster =', '        kind = 2\n        monster ='),
    behaviorFixture.replace('), kind)', '), label)'),
  ]) assert.ok(!inspectBehavior(source).some(item => item.ruleId === 'loop-type-image-mismatch'))
})

test('behavior requests mask all literals and include distant state reads with shared aliases', () => {
  const finding = inspectBehavior(behaviorFixture)[0]
  const aliases = {}
  const payload = makeCoachPayload(behaviorFixture, behaviorError(finding), 'file', aliases)
  assert.ok(payload)
  assert.equal(payload.errorType, 'BehaviorCheck')
  assert.equal(payload.finding, 'state-field-mismatch')
  assert.ok(payload.related.length)
  assert.deepEqual(validateStructurePayload(payload), payload)
  const rendered = renderStructure(payload)
  assert.match(rendered.related.join('\n'), /color=/)
  for (const privateText of ['PRIVATE_', 'target', 'picked', 'label', '_monster.png']) assert.ok(!JSON.stringify([payload, rendered]).includes(privateText), privateText)
  assert.ok(Object.values(aliases).includes('target_type'))
  assert.match(rendered.error, /no runtime exception/)
})

test('behavior request anchors on loop header, avoiding the masked formatted expression', () => {
  const finding = inspectBehavior(behaviorFixture)[1]
  const diagnostic = {}
  const payload = makeCoachPayload(behaviorFixture, behaviorError(finding), 'file', {}, diagnostic)
  assert.ok(payload, JSON.stringify(diagnostic))
  assert.equal(payload.finding, 'loop-type-image-mismatch')
})

test('related excerpts reject raw text, extra fields, oversized rows and invalid findings', () => {
  const payload = makeCoachPayload(behaviorFixture, behaviorError(inspectBehavior(behaviorFixture)[0]))
  for (const related of [null, [], 'private', [{ start: 0, rows: [[]] }], [{ start: 1, rows: [[['v', 'secret']]] }], [{ start: 1, rows: [[]], source: 'secret' }], [{ start: 1, rows: [[], [], []] }], Array(5).fill({ start: 1, rows: [[]] })]) {
    assert.throws(() => validateStructurePayload({ ...payload, related }))
  }
  assert.throws(() => validateStructurePayload({ ...payload, finding: 'attribute-spelling' }))
  assert.throws(() => validateStructurePayload({ ...payload, mode: 'notebook' }))
  assert.equal(makeCoachPayload('print(1)', { type: 'BehaviorCheck', message: 'state-field-mismatch', line: 1, eligible: true }), null)
})

test('runtime method typo keeps exact local correction and provides distant definition to AI', () => {
  const source = ['class Scene:', '    def update(self):', '        self.chose_target()', ...Array(20).fill(''), '    def choose_target(self):', '        pass'].join('\n')
  const error = parseError('  File "/tmp/studio/main.py", line 3\nAttributeError: \'Scene\' object has no attribute \'chose_target\'. Did you mean: \'choose_target\'?')
  const local = localFeedback(error, source)
  assert.equal(local.ruleId, 'attribute-spelling')
  assert.match(local.guide[1], /self.choose_target\(\)/)
  const payload = makeCoachPayload(source, error)
  assert.match(renderStructure(payload).related.join('\n'), /24: +def variable_\d+\(self\):/)
})

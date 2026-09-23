import assert from 'node:assert/strict'
import { findStudioSpelling, isOneEditAway } from '../src/components/PythonWorld/studioSpellingModel.js'

const project = { path: 'main.py', files: [] }
const check = (source, context = project) => findStudioSpelling(source, context).map(issue => [issue.actual, issue.suggestion])

assert.equal(isOneEditAway('bilt', 'blit'), true)
assert.equal(isOneEditAway('pritn', 'print'), true)
assert.equal(isOneEditAway('blit', 'blit'), false)
assert.equal(isOneEditAway('draw', 'blit'), false)

const pygameSetup = 'import pygame\nwindow = pygame.display.set_mode((800, 600))\n'
assert.deepEqual(check(`${pygameSetup}window.bilt(image, (0, 0))`), [['bilt', 'blit']])
assert.deepEqual(check(`${pygameSetup}window.bilt`), [['bilt', 'blit']])
assert.deepEqual(check(`${pygameSetup}window.blit(image, (0, 0))`), [])
assert.deepEqual(check(`${pygameSetup}window.bli`), []) // Still typing a valid prefix.
assert.deepEqual(check(`${pygameSetup}window.bli(image, (0, 0))`), [['bli', 'blit']]) // A completed call is not a prefix.
assert.deepEqual(check(`${pygameSetup}window.bilt = image`), []) // A new attribute may be intentional.
assert.deepEqual(check(`${pygameSetup}# window.bilt(image)\nprint('window.bilt(image)')`), [])
assert.deepEqual(check('unknown_object.bilt(image)'), []) // Unknown objects have no reliable method list.
assert.deepEqual(check('pritn("hello")'), [['pritn', 'print']])
assert.deepEqual(check('def pritn():\n    pass\npritn()'), []) // A student-defined name takes precedence.
assert.deepEqual(check('class Game:\n    def move(self):\n        pass\n    def draw(self):\n        self.mvoe()'), [['mvoe', 'move']])
assert.deepEqual(check('window.bilt(image)', { ...project, prefix: pygameSetup }), [['bilt', 'blit']])
assert.deepEqual(check(`${pygameSetup}window.bilt(image)`, { ...project, path: 'notebook.ipynb' }), [['bilt', 'blit']])

// Completion menus are partial: real APIs must not become spelling warnings.
assert.deepEqual(check(`${pygameSetup}window.blits([])`), [])
assert.deepEqual(check('import math\nmath.sinh(1)\nmath.cosh(1)'), [])
assert.deepEqual(check('from math import *\nsinh(1)'), [])
assert.deepEqual(check('from unknown_module import *\npritn()'), [])
assert.deepEqual(check('prin("hello")'), [['prin', 'print']])

// Unsupported binding forms must not borrow the spelling/type of an outer name.
for (const source of [
  '(lambda pritn: pritn())(print)',
  '[pritn() for pritn in callbacks]',
  'with resource() as pritn:\n    pritn()',
  'try:\n    pass\nexcept CustomError as pritn:\n    pritn()',
  'if (pritn := callback):\n    pritn()',
  '(pritn, other) = callbacks\npritn()',
  `${pygameSetup}(lambda window: window.bilt())(custom_object)`,
  `${pygameSetup}[window.bilt() for window in custom_objects]`,
  `${pygameSetup}first = window.bilt = callback`,
  'class Game:\n    def __getattr__(self, name):\n        return print\n    def draw(self):\n        self.darw()',
]) assert.deepEqual(check(source), [], source)

const cell = 'window.bilt(image)'
assert.deepEqual(findStudioSpelling(cell, { ...project, prefix: pygameSetup }), [
  { from: 7, to: 11, actual: 'bilt', suggestion: 'blit' },
])
assert.deepEqual(check(cell, { ...project, prefix: 'window = unknown_object\n' }), [])

console.log('Python Code Studio spelling checks passed')

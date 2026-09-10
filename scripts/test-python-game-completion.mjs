import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createStudioAnalyzer } from '../src/components/PythonWorld/studioCompletionModel.js'
const suggest = (source, analyzer = createStudioAnalyzer(), path = 'main.py') => {
  const pos = source.indexOf('|') < 0 ? source.length : source.indexOf('|')
  return analyzer.complete(source.replace('|', ''), pos, path, true)
}
const labels = (...args) => suggest(...args)?.options.map(o => o.label) || []
test('turtle aliases, Colab wildcard and module chains infer actual objects', () => {
  for (const head of ['from turtle import *\nt=Turtle()', 'import turtle as tu\nt=tu.Turtle()', 'from ColabTurtlePlus.Turtle import Turtle as Pen\nt=Pen()']) {
    assert.ok(labels(head+'\nt.').includes('forward'))
    assert.ok(labels(head+'\nt.screen.').includes('bgcolor'))
    assert.ok(!labels(head+'\nt.').includes('onclick'), 'unsupported turtle methods are not advertised')
  }
})
test('pygame modules, chained return values, rects, events, fonts and sound', () => {
  for (const [expr, member] of [['pg.display', 'set_mode'], ['pg.image.load("hero.png").convert_alpha()', 'blit'], ['pg.image.load("hero.png").get_rect()', 'centerx'], ['pg.font.Font(None, 20).render("Hi", True, "white")', 'get_rect'], ['pg.time.Clock()', 'tick'], ['pg.mixer.Sound("sound.ogg")', 'play']]) assert.ok(labels(`import pygame as pg\nobj=${expr}\nobj.`).includes(member), expr)
  assert.ok(labels('import pygame\nfor event in pygame.event.get():\n    event.').includes('key'))
  assert.ok(labels('import pygame as pg\nimage=pg.image.load("hero.png").convert_alpha()\nrect=image.get_rect()\nrect.cen').includes('centerx'))
})
test('user classes, self attributes, inheritance, returns, annotations and scope', () => {
  const head='import pygame\nclass Hero(pygame.sprite.Sprite):\n    def __init__(self, name):\n        self.name = name\n        self.rect = pygame.Rect(0,0,10,10)\n    def move(self, dx):\n        hidden = 1\n        self.rect.x += dx\nhero=Hero("me")\nhero.health=100\n'
  assert.ok(labels(head+'hero.').includes('move'))
  assert.ok(labels(head+'hero.').includes('health'))
  assert.ok(labels(head+'hero.').includes('kill'))
  assert.ok(labels(head+'hero.rect.').includes('colliderect'))
  assert.equal(suggest(head+'he').options.find(o=>o.label==='hero').signature, undefined)
  assert.ok(!labels(head+'hi').includes('hidden'))
  assert.ok(labels('class Game:\n    WIDTH=800\ngame=Game()\ngame.').includes('WIDTH'))
  assert.ok(labels('def greet(name: str):\n    name.').includes('upper'))
  assert.ok(labels('def make():\n    return "hello"\nvalue=make()\nvalue.').includes('upper'))
  assert.ok(labels('def first(secret):\n    local=1\ndef second(other):\n    |').includes('other'))
  assert.ok(!labels('def first(secret):\n    local=1\ndef second(other):\n    |').includes('secret'))
})
test('list items, loop variables, text, dictionaries and reassignment', () => {
  assert.ok(labels('from turtle import Turtle\nturtles=[]\nt=Turtle()\nturtles.append(t)\nturtles[0].').includes('forward'))
  assert.ok(labels('items=["one"]\nfor item in items:\n    item.').includes('upper'))
  assert.ok(labels('data={}\ndata.').includes('items'))
  assert.ok(!labels('from turtle import Turtle\nt=Turtle()\nt="text"\nt.').includes('forward'))
})
test('project module freshness, path suggestions, renamed and deleted files', () => {
  let files=[{path:'helper.py',kind:'python',text:'class Buddy:\n    def wave(self): pass\n'},{path:'images/hero.png',kind:'image'}]
  const a=createStudioAnalyzer(()=>({files}))
  const code='from helper import *\nx=Buddy()\nx.'
  assert.ok(labels(code,a).includes('wave'))
  files=[{...files[0],text:'class Buddy:\n    def jump(self): pass\n'},files[1]]
  assert.ok(labels(code,a).includes('jump'));assert.ok(!labels(code,a).includes('wave'))
  assert.ok(labels('import pygame\npygame.image.load("im',a).includes('images/hero.png'))
  files=[];assert.ok(!labels(code,a).includes('jump'))
})
test('comments, ordinary strings and unknown objects do not get misleading methods', () => {
  assert.equal(suggest('# print'),null)
  assert.equal(suggest('text="print'),null)
  assert.equal(suggest('from turtle import *\nt=Turtle()\nt.color("red") # col'),null)
  assert.deepEqual(labels('unknown.'),[])
  assert.ok(labels('from turtle import *\nt=Turtle()\nt.color("de').includes('deepskyblue'))
})
test('signature help, nested commas, imports and Unicode names', () => {
  const a=createStudioAnalyzer();const s='from turtle import *\nt=Turtle()\nt.goto(10, '
  assert.equal(a.signature(s,s.length,'main.py').argument,2)
  assert.match(a.signature(s,s.length,'main.py').signature,/goto\(x, y\)/)
  const nested='print((1,2), '
  assert.equal(a.signature(nested,nested.length,'main.py').argument,2)
  assert.ok(labels('from pygame import Re').includes('Rect'))
  assert.ok(labels('이름="학생"\n이').includes('이름'))
})

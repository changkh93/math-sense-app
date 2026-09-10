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

test('Tk lesson widgets, pandas records and CSV/PNG path recommendations', () => {
  const analyzer = createStudioAnalyzer(() => ({ files: [{ path: 'data/words.csv', kind: 'csv' }, { path: 'images/front.png', kind: 'image' }, { path: 'main.py', kind: 'python' }] }))
  for (const [init, property] of [['w=Tk()', 'after_cancel'], ['c=Canvas()', 'itemconfig'], ['b=Button()', 'grid']]) assert.ok(labels(`from tkinter import *\n${init}\n${init[0]}.`).includes(property))
  assert.ok(labels('import pandas as pd\ndata=pd.read_csv("data/words.csv")\ndata.').includes('to_dict'))
  assert.ok(labels('import pandas as pd\nrows=pd.read_csv("data/words.csv").to_dict(orient="records")\nrows.').includes('remove'))
  assert.deepEqual(labels('import pandas as pd\npd.read_csv("|', analyzer), ['data/words.csv'])
  assert.deepEqual(labels('from tkinter import *\nPhotoImage(file="|', analyzer), ['images/front.png'])
  assert.ok(!labels('from tkinter import *\nc=Canvas()\nc.').includes('create_window'))
})

test('pandas lesson Series, row filters, real CSV headers and schema freshness', () => {
  let files = [{ path: 'weather.csv', kind: 'csv', data: Buffer.from('요일,온도,날씨\n월,20,맑음\n').toString('base64') }]
  const analyzer = createStudioAnalyzer(() => ({ files }))
  const head = 'import pandas as pd\ndata=pd.read_csv("weather.csv")\n'
  assert.ok(labels(head+'data.', analyzer).includes('온도'))
  assert.ok(labels(head+'data.온도.', analyzer).includes('mean'))
  assert.ok(labels(head+'data["온도"].', analyzer).includes('max'))
  assert.ok(labels(head+'selected=data[data.온도>=20]\nselected.', analyzer).includes('to_csv'))
  assert.ok(labels(head+'data.head().온도.', analyzer).includes('to_list'))
  assert.deepEqual(labels(head+'data["|', analyzer), ['요일', '온도', '날씨'])
  assert.deepEqual(labels(head+'data[data.요일 == "|', analyzer), [])
  assert.ok(!labels(head+'selected=data[["온도"]]\nselected.', analyzer).includes('요일'))
  assert.ok(labels(head+'data.to_dict().').includes('items'))
  assert.ok(labels(head+'data.to_dict("records").').includes('append'))
  const quiz='import pandas as pd\nvalues={"name": ["홍길동"], "scores": [90]}\ndata=pd.DataFrame(values)\n'
  assert.ok(labels(quiz+'data.').includes('scores'))
  assert.ok(labels(quiz+'data.scores.').includes('mean'))
  files = [{ ...files[0], data: Buffer.from('기온,"도시,이름"\n10,서울\n').toString('base64') }]
  assert.deepEqual(labels(head+'data["|', analyzer), ['기온', '도시,이름'])
  assert.ok(!labels(head+'data.', analyzer).includes('온도'))
})

test('math lesson modules, arrays and Matplotlib axes offer appropriate suggestions', () => {
  for (const [code, expected] of [
    ['import numpy as np\nnp.', 'histogram'], ['import numpy as np\nhist,bins=np.histogram([1,2])\nhist.', 'sum'], ['import numpy as np\nnp.random.', 'randint'],
    ['import numpy as np\na=np.array([1,2])\na.', 'reshape'],
    ['import numpy as np\na=np.arange(10)*2\na.', 'mean'],
    ['import matplotlib.pyplot as plt\nplt.', 'hist'],
    ['import matplotlib.pyplot as plt\nax=plt.axes()\nax.', 'scatter'],
    ['import matplotlib.pyplot as plt\nf=plt.figure()\nf.', 'add_subplot'],
    ['from fractions import Fraction\nf=Fraction(5,12)\nf.', 'numerator'],
    ['import itertools\nitertools.', 'product'],
    ['import pandas as pd\nh=pd.DataFrame({"x":[1]})\nh.', 'loc'],
  ]) assert.ok(labels(code).includes(expected), code)
})

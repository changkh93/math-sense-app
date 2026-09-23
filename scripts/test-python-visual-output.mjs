import test from 'node:test'
import assert from 'node:assert/strict'
import { projectUsesVisualOutput, sourceUsesVisualOutput } from '../src/components/PythonGameStudio/visualOutput.mjs'

test('plain console programs do not request a visual window', () => {
  assert.equal(sourceUsesVisualOutput('print("hello world")'), false)
  assert.equal(sourceUsesVisualOutput('import math\nprint(math.sqrt(9))'), false)
  assert.equal(sourceUsesVisualOutput('import turtle\nimport pygame\nprint("hello world")'), false)
  assert.equal(sourceUsesVisualOutput('import turtle\n# turtle.Turtle()\nprint("turtle.forward(100)")'), false)
  assert.equal(sourceUsesVisualOutput('"""import turtle\nturtle.Turtle()"""\nprint("ok")'), false)
  assert.equal(sourceUsesVisualOutput('print("pygame.display.set_mode((800, 600))")'), false)
  assert.equal(sourceUsesVisualOutput('plt.plot([1])'), false)
})

test('supported graphical APIs request a visual window', () => {
  assert.equal(sourceUsesVisualOutput('import turtle as t\npen = t.Turtle()\npen.forward(80)'), true)
  assert.equal(sourceUsesVisualOutput('from turtle import *\nforward(80)\ndone()'), true)
  assert.equal(sourceUsesVisualOutput('import matplotlib.pyplot as graph\ngraph.plot([1, 2])\ngraph.show()'), true)
  assert.equal(sourceUsesVisualOutput('import pygame\nscreen = pygame.display.set_mode((800, 600))'), true)
  assert.equal(sourceUsesVisualOutput('import tkinter as tk\nroot = tk.Tk()'), true)
  assert.equal(sourceUsesVisualOutput('from turtle import Turtle as Pen\nPen()'), true)
  assert.equal(sourceUsesVisualOutput('from pygame import display\ndisplay.set_mode((800, 600))'), true)
  assert.equal(sourceUsesVisualOutput('from matplotlib import pyplot as plt\nplt.show()'), true)
  assert.equal(sourceUsesVisualOutput('import matplotlib.pyplot\nmatplotlib.pyplot.plot([1])'), true)
})

test('visual intent is detected in imported project helpers', () => {
  assert.equal(projectUsesVisualOutput({ files: [
    { path: 'main.py', kind: 'python', text: 'from scene import draw\ndraw()' },
    { path: 'scene.py', kind: 'python', text: 'import matplotlib.pyplot as plt\nplt.scatter([1], [2])' },
  ] }), true)
})

test('unrelated graphical files and the saved default do not affect the selected console script', () => {
  const project = { entrypoint: 'game.py', files: [
    { path: 'main.py', kind: 'python', text: 'print("hello world")' },
    { path: 'game.py', kind: 'python', text: 'import pygame\npygame.display.set_mode((800, 600))' },
    { path: 'drawing.py', kind: 'python', text: 'import turtle\nturtle.forward(100)' },
  ] }
  assert.equal(projectUsesVisualOutput(project, 'main.py'), false)
  assert.equal(projectUsesVisualOutput(project), true)
  assert.equal(projectUsesVisualOutput(project, 'drawing.py'), true)
  assert.equal(projectUsesVisualOutput(project, 'missing.py'), false)
})

test('import graph follows packages, relative imports and cycles, ignoring strings and comments', () => {
  const project = { entrypoint: 'main.py', files: [
    { path: 'main.py', kind: 'python', text: 'from scene import draw' },
    { path: 'scene/__init__.py', kind: 'python', text: 'from .pen import draw' },
    { path: 'scene/pen.py', kind: 'python', text: 'import main\nimport turtle\nturtle.forward(100)' },
  ] }
  assert.equal(projectUsesVisualOutput(project), true)
  project.files[0].text = '# from scene import draw\nprint("import scene")'
  assert.equal(projectUsesVisualOutput(project), false)
  project.files[0].text = 'import helper'
  project.files.push({ path: 'helper.py', kind: 'python', text: 'import main\nprint("ok")' })
  assert.equal(projectUsesVisualOutput(project), false)
})

test('notebooks are not included in a file-mode run', () => {
  assert.equal(projectUsesVisualOutput({ entrypoint: 'main.py', files: [
    { path: 'main.py', kind: 'python', text: 'print("hello world")' },
    { path: 'notebook.ipynb', kind: 'notebook', text: 'import turtle\nturtle.forward(100)' },
  ] }), false)
})

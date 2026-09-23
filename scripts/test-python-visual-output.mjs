import test from 'node:test'
import assert from 'node:assert/strict'
import { projectUsesVisualOutput, sourceUsesVisualOutput } from '../src/components/PythonGameStudio/visualOutput.mjs'

test('plain console programs do not request a visual window', () => {
  assert.equal(sourceUsesVisualOutput('print("hello world")'), false)
  assert.equal(sourceUsesVisualOutput('import math\nprint(math.sqrt(9))'), false)
})

test('supported graphical APIs request a visual window', () => {
  assert.equal(sourceUsesVisualOutput('import turtle as t\npen = t.Turtle()\npen.forward(80)'), true)
  assert.equal(sourceUsesVisualOutput('from turtle import *\nforward(80)\ndone()'), true)
  assert.equal(sourceUsesVisualOutput('import matplotlib.pyplot as graph\ngraph.plot([1, 2])\ngraph.show()'), true)
  assert.equal(sourceUsesVisualOutput('import pygame\nscreen = pygame.display.set_mode((800, 600))'), true)
  assert.equal(sourceUsesVisualOutput('import tkinter as tk\nroot = tk.Tk()'), true)
})

test('visual intent is detected in imported project helpers', () => {
  assert.equal(projectUsesVisualOutput({ files: [
    { path: 'main.py', kind: 'python', text: 'from scene import draw\ndraw()' },
    { path: 'scene.py', kind: 'python', text: 'import matplotlib.pyplot as plt\nplt.scatter([1], [2])' },
  ] }), true)
})

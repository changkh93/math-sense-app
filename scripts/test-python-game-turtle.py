"""Lesson geometry/control-flow checks, independent of browser rendering."""
import ast
import asyncio
import pathlib
import sys
import types
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = (ROOT / 'runtime/python-game-runner/turtle.py').read_text()
HTML = (ROOT / 'runtime/python-game-runner/index.html').read_text()
compiler = {'ast': ast, 'asyncio': asyncio}
exec(HTML[HTML.index('class FrameCallFinder'):HTML.index('def cancel_user_callbacks')], compiler)


class Bridge:
    def __init__(self): self.commands = []
    def studioTurtleCommand(self, data):
        import json
        self.commands.append(json.loads(data))
    def studioTurtleValidColor(self, value): return value != 'notacolor'


class TurtleTest(unittest.TestCase):
    def setUp(self):
        self.bridge = Bridge()
        self.module = types.ModuleType('turtle')
        self.module.__dict__['_bridge'] = self.bridge
        exec(SOURCE, self.module.__dict__)
        package = types.ModuleType('ColabTurtlePlus')
        package.__path__ = []
        package.Turtle = self.module
        self.previous = {key: sys.modules.get(key) for key in ('turtle', 'ColabTurtlePlus', 'ColabTurtlePlus.Turtle')}
        sys.modules.update({'turtle': self.module, 'ColabTurtlePlus': package, 'ColabTurtlePlus.Turtle': self.module})
    def tearDown(self):
        for key, value in self.previous.items():
            if value is None: sys.modules.pop(key, None)
            else: sys.modules[key] = value
    def execute(self, source):
        namespace = {}
        exec(compiler['compile_project'](source, 'lesson.py', namespace), namespace)
        return namespace
    def test_user_house_fills_and_coordinates(self):
        result = self.execute((ROOT / 'public/python-game-examples/turtle/house.py').read_text())
        fills = [c for c in self.bridge.commands if c['op'] == 'end-fill']
        self.assertEqual(len(fills), 13)
        self.assertEqual(fills[0]['color'], 'deepskyblue')
        self.assertEqual(fills[0]['points'][0], [-400, -100])
        self.assertAlmostEqual(max(p[1] for p in fills[0]['points']), 300)
        self.assertEqual(fills[1]['color'], 'yellow')
        self.assertAlmostEqual(max(p[1] for p in fills[1]['points']), 280)
        self.assertFalse(result['t'].isvisible())
        self.assertEqual(result['screen'].window_width(), 800)
    def test_user_race_winner_matches_python_positions(self):
        import random
        random.seed(7)
        result = self.execute((ROOT / 'public/python-game-examples/turtle/race.py').read_text())
        racers = result['turtles']
        winner = next(i for i, t in enumerate(racers) if t.xcor() >= 240)
        texts = [c for c in self.bridge.commands if c['op'] == 'write']
        self.assertEqual(texts[0]['text'], '거북이 경주')
        self.assertEqual(texts[-1]['color'], ['blue', 'pink', 'purple', 'red'][winner])
        self.assertEqual([t.ycor() for t in racers], [150, 50, -50, -150])
        self.assertTrue(all(t.pensize() == 1.5 for t in racers))
    def test_standard_import_aliases_circle_orientation_and_rgb(self):
        result = self.execute('import turtle as t\nt.speed(0)\nt.circle(10, 90)\npos=t.pos()\nangle=t.heading()\nt.colormode(255)\nt.color(255, 0, 128)\nt.done()\n')
        self.assertAlmostEqual(result['pos'][0], 10)
        self.assertAlmostEqual(result['pos'][1], 10)
        self.assertEqual(result['angle'], 90)
        self.assertEqual(self.module.color(), ('#ff0080', '#ff0080'))
        t = self.module.Turtle()
        t.circle(-10, 90)
        self.assertAlmostEqual(t.xcor(), 10)
        self.assertAlmostEqual(t.ycor(), -10)
        self.assertEqual(t.heading(), 270)
        self.execute('import ColabTurtlePlus.Turtle as c\nc.forward(10)')
    def test_directive_only_and_original_line_numbers(self):
        result = self.execute('text="""\n!pip install ColabTurtlePlus\n"""\n!pip install ColabTurtlePlus\n')
        self.assertIn('!pip install', result['text'])
        with self.assertRaises(SyntaxError): self.execute('!pip install other_package')
        with self.assertRaises(SyntaxError) as caught: self.execute('!pip install ColabTurtlePlus\nmissing =\n')
        self.assertEqual(caught.exception.lineno, 2)
    def test_invalid_values_and_fresh_state(self):
        t = self.module.Turtle()
        for value in [float('inf'), float('nan')]:
            with self.assertRaises(self.module.TurtleGraphicsError): t.forward(value)
        with self.assertRaises(self.module.TurtleGraphicsError): t.color('notacolor')
        with self.assertRaises(self.module.TurtleGraphicsError): t.pensize(-1)
        t.forward(100)
        self.module.clearscreen()
        self.assertEqual(self.module.pos(), (0, 0))
        self.assertEqual(self.module.Screen().bgcolor(), 'white')


if __name__ == '__main__': unittest.main()

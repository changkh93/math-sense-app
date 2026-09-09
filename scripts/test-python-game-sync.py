"""Behavior checks for the runner's executable-copy pygame adaptation (stdlib only)."""
import ast
import asyncio
import inspect
import pathlib
import sys
import traceback
import types
import unittest

html = (pathlib.Path(__file__).resolve().parents[1] / 'runtime/python-game-runner/index.html').read_text()
compiler = {'ast': ast, 'asyncio': asyncio}
exec(html[html.index('class FrameCallFinder'):html.index('def cancel_user_callbacks')], compiler)
compile_project = compiler['compile_project']

class BrowserLoopsTest(unittest.TestCase):
    def setUp(self):
        self.updates = 0
        self.pg = types.ModuleType('pygame')
        self.pg.display = types.SimpleNamespace(update=self.update, flip=self.update)
        self.previous = sys.modules.get('pygame')
        sys.modules['pygame'] = self.pg
    def tearDown(self):
        if self.previous is None: sys.modules.pop('pygame', None)
        else: sys.modules['pygame'] = self.previous
    def update(self): self.updates += 1
    def run_source(self, source):
        namespace = {'__name__': '__main__'}
        result = eval(compile_project(source, '/tmp/studio/main.py', namespace), namespace)
        self.assertTrue(inspect.iscoroutine(result))
        asyncio.run(result)
        return namespace
    def test_globals_functions_continue_and_loop_else(self):
        namespace = self.run_source('import pygame as pg\ncount=0\ndef read_count(): return count\nwhile count<3:\n    count+=1\n    if count==1: continue\n    pg.display.flip()\nelse:\n    answer=read_count()\n')
        self.assertEqual(namespace['answer'], 3)
        self.assertEqual(self.updates, 2)
    def test_from_alias_and_for_loop(self):
        self.run_source('from pygame import display as screen\nfor i in range(3):\n    screen.update()\n')
        self.assertEqual(self.updates, 3)
    def test_error_keeps_original_source_line(self):
        source = 'import pygame\nwhile True:\n    pygame.display.update()\n    raise ValueError("original")\n'
        try: self.run_source(source)
        except ValueError as error:
            frame = [item for item in traceback.extract_tb(error.__traceback__) if item.filename == '/tmp/studio/main.py'][-1]
            self.assertEqual(frame.lineno, 4)
        else: self.fail('Expected student error')
    def test_unrelated_loops_strings_and_existing_functions_are_not_rewritten(self):
        for source in ['while True:\n    pass\n', 'text="pygame.display.update()"\nfor i in range(3): pass\n', 'import pygame\ndef main():\n    while True: pygame.display.update()\n', 'import pygame\nasync def main():\n    while True: pygame.display.update()\n']:
            code = compile_project(source, '/tmp/studio/main.py', {})
            self.assertFalse(code.co_flags & inspect.CO_COROUTINE)

if __name__ == '__main__': unittest.main()

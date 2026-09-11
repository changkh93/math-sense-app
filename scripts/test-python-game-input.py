"""Actual executable-copy compiler and asynchronous input bridge behavior."""
import ast
import base64
import asyncio
import inspect
import json
import pathlib
import types
import unittest

html = (pathlib.Path(__file__).resolve().parents[1] / 'runtime/python-game-runner/index.html').read_text()

class InputTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.answers, self.prompts, self.events = [], [], []
        self.closed = []
        self.waiting = asyncio.Event()
        def begin(run, request, prompt):
            self.prompts.append((run, request, base64.b64decode(prompt).decode('utf-8')))
            self.waiting.set()
        self.scope = dict(ast=ast, asyncio=asyncio, json=json, base64=base64,
            emit=lambda *values: self.events.append(values),
            platform=types.SimpleNamespace(window=types.SimpleNamespace(
                studioBeginInput=begin,
                studioTakeInput=lambda *_: json.dumps({'value': self.answers.pop(0)}) if self.answers else '',
                studioEndInput=lambda *values: self.closed.append(values))),
            active={'id': 'test-run', 'input_lock': asyncio.Lock(), 'input_number': 0})
        exec(html[html.index('def unsupported_input'):html.index('def project_packages')], self.scope)
        exec(html[html.index('class FrameCallFinder'):html.index('def cancel_user_callbacks')], self.scope)

    async def run_source(self, source, answers):
        self.answers = list(answers)
        namespace = {'__name__': '__main__'}
        result = eval(self.scope['compile_project'](source, '/tmp/studio/main.py', namespace), namespace)
        if inspect.isawaitable(result): await result
        return namespace

    async def test_numeric_korean_empty_and_whitespace(self):
        ns = await self.run_source("feel=int(input('오늘의 기분: '))\nname=input()\nempty=input('')\nspaces=input('공백')", ['80', '왕새우', '', '  그대로  '])
        self.assertEqual([ns[k] for k in ['feel', 'name', 'empty', 'spaces']], [80, '왕새우', '', '  그대로  '])
        self.assertEqual([p[1] for p in self.prompts], ['1', '2', '3', '4'])
        self.assertEqual(len(self.closed), 4)

    async def test_direct_function_chain_method_and_loop(self):
        ns = await self.run_source('''def ask(): return int(input('숫자'))
def twice(): return ask()*2
class Question:
    def read(self): return input('이름')
q=Question()
name=q.read()
values=[]
for _ in range(2): values.append(twice())
''', ['학생', '3', '5'])
        self.assertEqual(ns['name'], '학생')
        self.assertEqual(ns['values'], [6, 10])

    async def test_async_and_already_awaited_input(self):
        ns = await self.run_source("async def ask():\n    return input('a') + await input('b')\nanswer=await ask()", ['하', '나'])
        self.assertEqual(ns['answer'], '하나')

    async def test_shadowed_input_not_rewritten(self):
        ns = await self.run_source("input=lambda prompt='': 'custom'\nvalue=input()", [])
        self.assertEqual(ns['value'], 'custom')
        ns = await self.run_source("def read(input): return input()\nvalue=read(lambda: 42)", [])
        self.assertEqual(ns['value'], 42)
        self.assertEqual(self.prompts, [])

    async def test_bad_number_reports_student_line(self):
        import traceback
        try: await self.run_source("\nvalue=int(input('숫자'))", ['아니요'])
        except ValueError as error:
            frames = traceback.extract_tb(error.__traceback__)
            self.assertEqual([f.lineno for f in frames if f.filename == '/tmp/studio/main.py'], [2])
            self.assertIn('invalid literal', str(error))
        else: self.fail('Expected ValueError for non-numeric input')

    async def test_wait_is_cooperative_and_cancel_cleans_request(self):
        task = asyncio.create_task(self.run_source("value=input('기다려요')", []))
        await self.waiting.wait()
        await asyncio.sleep(.03)
        self.assertFalse(task.done())
        task.cancel()
        with self.assertRaises(asyncio.CancelledError): await task
        self.assertEqual(self.closed, [('test-run', '1')])
        self.assertFalse(self.scope['active']['input_lock'].locked())

    async def test_concurrent_async_questions_are_serial(self):
        a = asyncio.create_task(self.scope['studio_input']('첫째'))
        b = asyncio.create_task(self.scope['studio_input']('둘째'))
        await self.waiting.wait()
        await asyncio.sleep(.02)
        self.assertEqual(len(self.prompts), 1)
        self.answers.append('A')
        self.assertEqual(await a, 'A')
        await asyncio.sleep(.02)
        self.assertEqual(len(self.prompts), 2)
        self.answers.append('B')
        self.assertEqual(await b, 'B')

if __name__ == '__main__': unittest.main()

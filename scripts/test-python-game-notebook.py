import ast, asyncio, pathlib, types, unittest, inspect, json, base64
html=(pathlib.Path(__file__).resolve().parents[1]/'runtime/python-game-runner/index.html').read_text()
class NotebookCompilerTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.output=[]
        async def answer(prompt=''): return '21'
        self.scope=dict(ast=ast,asyncio=asyncio,types=types,studio_input=answer,notebook_display=self.output.append)
        exec(html[html.index('class FrameCallFinder'):html.index('def cancel_user_callbacks')],self.scope)
        self.ns={'__name__':'__main__'}
    async def run_cell(self,source):
        result=eval(self.scope['compile_project'](source,'/tmp/studio/main.py',self.ns,notebook=True),self.ns)
        if inspect.isawaitable(result): await result
    async def test_state_and_last_expression(self):
        await self.run_cell('values=[1,2]\nx=40')
        await self.run_cell('values.append(3)\nx+len(values)')
        self.assertEqual(self.output[-1],43)
        await self.run_cell('99; # quiet');self.assertEqual(self.output[-1],43)
    async def test_function_input_defined_in_earlier_cell(self):
        await self.run_cell("def ask(): return int(input('숫자'))")
        await self.run_cell('ask()*2')
        self.assertEqual(self.output[-1],42)
    async def test_prior_object_method_input(self):
        await self.run_cell("class Question:\n    def ask(self): return int(input('숫자'))\nq=Question()")
        await self.run_cell('q.ask()+1')
        self.assertEqual(self.output[-1],22)
    async def test_prior_pygame_import(self):
        pg=types.ModuleType('pygame');pg.event=types.SimpleNamespace(get=lambda:[])
        self.ns['pg']=pg
        await self.run_cell('n=0\nwhile n<3:\n    pg.event.get()\n    n+=1\nn')
        self.assertEqual(self.output[-1],3)
    async def test_error_preserves_prior_values(self):
        await self.run_cell('x=42')
        with self.assertRaises(ZeroDivisionError): await self.run_cell('1/0')
        await self.run_cell('x');self.assertEqual(self.output[-1],42)
    async def test_syntax_error_reports_cell_not_notebook_json(self):
        import tempfile
        with tempfile.TemporaryDirectory() as directory:
            filename = pathlib.Path(directory) / 'notebook.ipynb'
            filename.write_text('{\n"cells": []\n}')
            with self.assertRaises(SyntaxError) as caught:
                self.scope['compile_project']('print("hello world"a)', str(filename), self.ns, notebook=True)
            self.assertEqual(caught.exception.lineno, 1)
            self.assertEqual(caught.exception.filename, str(filename))
            self.assertGreater(caught.exception.offset, 2)
            self.assertEqual(caught.exception.text.strip(), 'print("hello world"a)')
    async def test_runtime_traceback_uses_each_executed_cell_not_json(self):
        import tempfile
        with tempfile.TemporaryDirectory() as directory:
            filename = pathlib.Path(directory) / 'notebook.ipynb'
            original = '{\n"metadata": {}\n}'
            filename.write_text(original)
            async def run(source):
                code = self.scope['compile_project'](source, str(filename), self.ns, notebook=True)
                result = eval(code, self.ns)
                if inspect.isawaitable(result): await result
            await run('def earlier():\n    return 1 / 0')
            # Same filename, different code and line contents, retained function.
            try:
                await run('earlier()')
            except ZeroDivisionError as error:
                text = self.scope['format_studio_exception'](error)
                self.assertIn('return 1 / 0', text)
                self.assertIn('earlier()', text)
                self.assertNotIn('"metadata":', text)
            else: self.fail('Expected error from earlier cell')
            try:
                await run('print(missing_value)')
            except NameError as error:
                text = self.scope['format_studio_exception'](error)
                self.assertIn('print(missing_value)', text)
                self.assertNotIn('"metadata":', text)
            else: self.fail('Expected NameError')
            self.assertEqual(filename.read_text(), original)

class NotebookPackageTest(unittest.TestCase):
    def test_incomplete_other_cell_does_not_block_numpy_or_matplotlib(self):
        scope = dict(ast=ast, json=json, base64=base64)
        exec(html[html.index('def project_packages'):html.index('class FrameCallFinder')],scope)
        text=json.dumps({'cells':[{'cell_type':'code','source':['import numpy as np\n','import matplotlib.pyplot as plt']},{'cell_type':'code','source':'print("unfinished)'},{'cell_type':'markdown','source':'hello'}]})
        project={'files':[{'path':'notebook.ipynb','data':base64.b64encode(text.encode()).decode()}]}
        packages=scope['project_packages'](project)
        self.assertIn('numpy',packages);self.assertIn('matplotlib',packages)
if __name__=='__main__': unittest.main()

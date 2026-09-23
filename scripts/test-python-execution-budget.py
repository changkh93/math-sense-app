"""Keep browser scheduling pauses out of the student execution budget."""
import pathlib
import textwrap
import types
import unittest

html = (pathlib.Path(__file__).resolve().parents[1] / 'runtime/python-game-runner/index.html').read_text()
source = textwrap.dedent(html.split('    def trace(frame, event, arg):', 1)[1].split("    context['trace'] = trace", 1)[0])


class ExecutionBudgetTests(unittest.TestCase):
    def setUp(self):
        self.now = 10
        self.context = {'deadline': 1}
        scope = {'ROOT': '/tmp/studio', 'context': self.context, 'time': types.SimpleNamespace(monotonic=lambda: self.now)}
        exec('def trace(frame, event, arg):\n' + textwrap.indent(source, '    '), scope)
        self.trace = scope['trace']

    def frame(self, caller):
        return types.SimpleNamespace(f_code=types.SimpleNamespace(co_filename='/tmp/studio/main.py'), f_back=types.SimpleNamespace(f_code=types.SimpleNamespace(co_filename=caller)))

    def test_asyncio_resume_after_browser_pause_gets_fresh_slice(self):
        frame = self.frame('/usr/lib/python3.12/asyncio/events.py')
        self.trace(frame, 'call', None)
        self.trace(frame, 'line', None)
        self.assertEqual(self.context['deadline'], 12)

    def test_student_calls_do_not_extend_uninterrupted_loop_budget(self):
        frame = self.frame('/tmp/studio/helper.py')
        self.trace(frame, 'call', None)
        with self.assertRaisesRegex(RuntimeError, '반복문'):
            self.trace(frame, 'line', None)

    def test_resumed_task_is_still_stopped_if_it_does_not_yield(self):
        frame = self.frame('/usr/lib/python3.12/asyncio/events.py')
        self.trace(frame, 'call', None)
        self.now = 13
        with self.assertRaises(RuntimeError):
            self.trace(frame, 'line', None)


if __name__ == '__main__':
    unittest.main()

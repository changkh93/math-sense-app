import base64
import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]


def module(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'runtime/python-game-runner' / filename)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


class Bridge:
    def __init__(self): self.commands, self.events = [], []
    def studioTkCommand(self, encoded): self.commands.append(json.loads(base64.b64decode(encoded)))
    def studioTkTakeEvents(self):
        result, self.events = json.dumps(self.events), []
        return result


class TkTests(unittest.TestCase):
    def setUp(self):
        self.tk = module('studio_tk_test', 'tkinter.py')
        self.tk._bridge = self.bridge = Bridge()

    def test_timer_cancellation_and_rearming(self):
        tk, calls = self.tk, []
        root = tk.Tk()
        with patch.object(tk.time, 'monotonic', return_value=0):
            old = root.after(3000, lambda: calls.append('old'))
            root.after_cancel(old)
            root.after(3000, func=lambda: calls.append('new'))
        root.mainloop()
        with patch.object(tk.time, 'monotonic', return_value=2.9): tk._pump()
        self.assertEqual(calls, [])
        with patch.object(tk.time, 'monotonic', return_value=3.1): tk._pump(); tk._pump()
        self.assertEqual(calls, ['new'])
        root.destroy()
        self.assertFalse(tk._busy())
        self.assertFalse(root._timers)

    def test_button_cancels_due_timer_before_pump(self):
        root, calls = self.tk.Tk(), []
        timer = root.after(0, lambda: calls.append('stale'))
        button = self.tk.Button(command=lambda: root.after_cancel(timer))
        self.bridge.events = [button._id]
        root.mainloop(); self.tk._pump()
        self.assertEqual(calls, [])

    def test_lesson_canvas_images_and_errors(self):
        tk = self.tk
        root = tk.Tk(); root.config(padx=50, bg='#B1DDC6')
        image = tk.PhotoImage(file=ROOT / 'public/python-game-examples/tkinter/images/card_front.png')
        self.assertEqual((image.width(), image.height()), (800, 526))
        canvas = tk.Canvas(width=800, height=526)
        canvas.grid(row=0, column=0, columnspan=2)
        item = canvas.create_image(400, 263, image=image)
        canvas.itemconfig(item, image=image)
        text = canvas.create_text(400, 253, text='사과', font=('Arial', 60, 'bold'))
        canvas.itemconfig(text, fill='white', text='거북이')
        self.assertEqual(self.bridge.commands[-1]['values']['text'], '거북이')
        with self.assertRaises(tk.TclError): canvas.config(unknown=True)
        with self.assertRaises(tk.TclError): canvas.itemconfig(text, image=image)
        with self.assertRaises(tk.TclError): tk.Button(command='callback')
        with self.assertRaises(FileNotFoundError): tk.PhotoImage(file='missing.png')

    def test_callback_errors_propagate_to_driver(self):
        root = self.tk.Tk()
        def fail(): raise ValueError('student callback')
        root.after(0, fail); root.mainloop()
        with self.assertRaisesRegex(ValueError, 'student callback'): self.tk._pump()


class CsvTests(unittest.TestCase):
    def setUp(self): self.pd = module('studio_pd_test', 'studio_pandas.py')

    def test_unicode_quotes_bom_and_records_roundtrip(self):
        records = [{'English': 'cloud, sky', 'Korean': '구름 "하늘"'}, {'English': '007', 'Korean': '줄1\n줄2'}]
        text = self.pd.DataFrame(records).to_csv(index=False)
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'data.csv'; path.write_text(text, encoding='utf-8-sig')
            self.assertEqual(self.pd.read_csv(path).to_dict('records'), records)
            path.write_text('English,Korean\n', encoding='utf-8')
            self.assertEqual(self.pd.read_csv(path).to_dict('records'), [])
            path.write_text('a,b\n1,2,3\n', encoding='utf-8')
            with self.assertRaises(ValueError): self.pd.read_csv(path)
        with self.assertRaises(FileNotFoundError): self.pd.read_csv('missing.csv')

    def test_options_are_explicit_and_csv_write_is_bounded(self):
        frame = self.pd.DataFrame([], columns=['English', 'Korean'])
        self.assertEqual(frame.to_csv(index=False), 'English,Korean\n')
        self.assertEqual(frame.to_dict(), {'English': {}, 'Korean': {}})
        with self.assertRaises(NotImplementedError): frame.to_dict('unsupported')
        with self.assertRaises(NotImplementedError): frame.to_csv(sep=';')
        with self.assertRaises(NotImplementedError): self.pd.read_csv('data.csv', sep=';')
        with self.assertRaises(ValueError): frame.to_csv('/tmp/outside.csv')
        with self.assertRaises(ValueError): frame.to_csv('/tmp/studio/code.py')


if __name__ == '__main__': unittest.main()

import importlib.util
import math
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch, mock_open
sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('pandas', ROOT / 'runtime/python-game-runner/studio_pandas.py')
pd = importlib.util.module_from_spec(spec); spec.loader.exec_module(pd)


class Lessons(unittest.TestCase):
    def csv(self, text, **kwargs):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'weather.csv'; path.write_text(text, encoding='utf-8')
            return pd.read_csv(path, **kwargs)

    def test_weather_lesson(self):
        data = self.csv('요일,온도,날씨\n월,20,맑음\n화,25,흐림\n수,25,맑음\n')
        self.assertEqual(data['온도'][0], 20)
        self.assertIsInstance(data['온도'], pd.Series)
        self.assertEqual(data.온도.to_list(), [20, 25, 25])
        self.assertEqual(data.온도.mean(), sum(data.온도) / 3)
        self.assertEqual(data.온도.max(), 25)
        self.assertEqual(data[data.요일 == '월'].온도.to_list(), [20])
        self.assertEqual(data[data.온도 == data.온도.max()].index, [1, 2])
        self.assertEqual(data.to_dict()['온도'], {0: 20, 1: 25, 2: 25})
        self.assertIn('요일', str(data)); self.assertIn('dtype: int64', str(data.온도))
        self.assertNotIn('object at', str(data))

    def test_quizzes_one_to_five(self):
        data = pd.DataFrame({'name': ['왕새우', '홍길동', '박명수'], 'scores': [80, 90, 60]})
        self.assertEqual(data[data['name'] == '홍길동'].to_dict(), {'name': {1: '홍길동'}, 'scores': {1: 90}})
        self.assertEqual(data[data['scores'] == data['scores'].max()].to_dict('records'), [{'name': '홍길동', 'scores': 90}])
        city = pd.DataFrame({'city': ['서울', '부산', '인천'], 'population': [9904312, 3448737, 2890451], 'area': [605.21, 770.04, 1063.49]})
        self.assertEqual(city[city['population'] >= 3000000].city.tolist(), ['서울', '부산'])
        self.assertEqual(city.area[2], 1063.49)
        expected = ',city,population,area\n0,서울,9904312,605.21\n1,부산,3448737,770.04\n2,인천,2890451,1063.49\n'
        self.assertEqual(city.to_csv(), expected)
        self.assertEqual(self.csv(expected).city.tolist(), ['서울', '부산', '인천'])
        self.assertEqual(self.csv(expected).columns[0], 'Unnamed: 0')

    def test_numeric_inference_and_explicit_text(self):
        data = self.csv('\ufeff정수,소수,코드\n-3,1.5,007\n+2,2e2,008\n')
        self.assertEqual(data.정수.tolist(), [-3, 2]); self.assertEqual(data.소수.tolist(), [1.5, 200.0])
        self.assertEqual(data.코드.tolist(), [7, 8])
        text = self.csv('온도,코드\n20,007\n', dtype={'코드': str})
        self.assertEqual(text.코드[0], '007'); self.assertEqual(text.온도[0], 20)
        self.assertEqual(self.csv('온도\n20\n', dtype=str).온도[0], '20')
        mixed = self.csv('word\ncloud\n007\n')
        self.assertEqual(mixed.word.tolist(), ['cloud', '007'])

    def test_missing_and_empty_data(self):
        data = self.csv('요일,온도\n월,20\n화,\n수,30\n')
        self.assertTrue(math.isnan(data.온도[1])); self.assertEqual(data.온도.mean(), 25)
        self.assertTrue(math.isnan(data.온도.mean(skipna=False)))
        self.assertEqual(data.온도.max(), 30)
        self.assertEqual(data[data.온도 >= 25].index, [2])
        empty = data[data.온도 > 100]
        self.assertEqual(empty.shape, (0, 2)); self.assertTrue(empty.empty)
        self.assertTrue(math.isnan(empty.온도.mean()))
        self.assertEqual(empty.to_csv(index=False), '요일,온도\n')
        self.assertEqual(self.csv('English,Korean\n').to_dict('records'), [])
        self.assertIn('Empty DataFrame', str(empty))

    def test_index_retention_and_mask_alignment(self):
        data = pd.DataFrame({'x': [4, 8, 10]})
        selected = data[data.x >= 8]
        self.assertEqual(selected.x[1], 8)
        with self.assertRaises(KeyError): selected.x[0]
        self.assertEqual(selected.to_csv(), ',x\n1,8\n2,10\n')
        mask = pd.Series([True, False, True], index=[2, 0, 1])
        self.assertEqual(data[mask].index, [1, 2])
        with self.assertRaises(ValueError): data[pd.Series([True], index=[9])]
        with self.assertRaises(ValueError): data[[True]]
        with self.assertRaises(ValueError): bool(data.x)
        self.assertEqual(data[(data.x >= 8) & (data.x < 10)].x.tolist(), [8])
        self.assertEqual(data[~(data.x >= 8)].x.tolist(), [4])

    def test_dictionary_formats_and_no_mutation(self):
        data = pd.DataFrame([{'x': 1, 'y': 'a'}, {'x': 2, 'y': 'b'}])
        self.assertEqual(data.to_dict('list'), {'x': [1, 2], 'y': ['a', 'b']})
        self.assertEqual(data.to_dict('index')[1], {'x': 2, 'y': 'b'})
        self.assertEqual(data.to_dict('split'), {'index': [0, 1], 'columns': ['x', 'y'], 'data': [[1, 'a'], [2, 'b']]})
        rows = data.to_dict('records'); rows[0]['x'] = 99
        values = data.x.to_list(); values[0] = 99
        self.assertEqual(data.x[0], 1)
        self.assertEqual(data[['y']].columns, ['y']); self.assertEqual(data.head(1).shape, (1, 2))

    def test_explicit_errors_and_bounded_output(self):
        with self.assertRaises(ValueError): pd.DataFrame({'a': [1], 'b': [1, 2]})
        with self.assertRaises(NotImplementedError): pd.DataFrame({'a': 1})
        with self.assertRaises(KeyError): pd.DataFrame({'a': [1]})['missing']
        with self.assertRaises(NotImplementedError): self.csv('a\n1\n', sep=';')
        with self.assertRaises(TypeError): self.csv('a\ntext\n').a.mean()
        data = pd.DataFrame({('열' * 40) + str(i): ['한글' * 30] * 100 for i in range(30)})
        self.assertLess(len(str(data).encode('utf-8')), 7000)
        self.assertIn('100 rows x 30 columns', str(data))
        self.assertNotIn('object at', str(data))

    def test_csv_quotes_and_local_write_bridge(self):
        records = [{'word': 'cloud, sky', 'meaning': '구름 "하늘"\n다음 줄'}]
        frame = pd.DataFrame(records)
        self.assertEqual(self.csv(frame.to_csv(index=False)).to_dict('records'), records)
        saves = []
        pd._save_csv = lambda path, data: saves.append((path, data))
        file = mock_open()
        with patch('builtins.open', file):
            frame.to_csv('/tmp/studio/data/result.csv', index=False, encoding='utf-8-sig')
        self.assertEqual(saves[0][0], 'data/result.csv'); self.assertTrue(saves[0][1].startswith(b'\xef\xbb\xbf'))
        file().write.assert_called_once_with(saves[0][1])
        for path in ['/tmp/outside.csv', '/tmp/studio/main.py']:
            with self.assertRaises(ValueError): frame.to_csv(path)


class ReferenceParity(unittest.TestCase):
    def test_lesson_results_match_installed_pandas(self):
        try:
            import pandas as reference
        except ImportError:
            self.skipTest('Optional native pandas reference is not installed')
        for payload in [
            {'name': ['왕새우', '홍길동', '박명수'], 'scores': [80, 90, 60]},
            {'city': ['서울', '부산', '인천'], 'population': [9904312, 3448737, 2890451], 'area': [605.21, 770.04, 1063.49]},
        ]:
            actual, expected = pd.DataFrame(payload), reference.DataFrame(payload)
            self.assertEqual(actual.to_dict(), expected.to_dict())
            self.assertEqual(actual.to_csv(), expected.to_csv())
            for key, values in payload.items():
                self.assertEqual(actual[key].tolist(), expected[key].tolist())
                if isinstance(values[0], (int, float)):
                    self.assertEqual(actual[key].mean(), expected[key].mean())
                    self.assertEqual(actual[actual[key] == actual[key].max()].to_dict(), expected[expected[key] == expected[key].max()].to_dict())
        import io
        for csv_text in ['요일,온도\n월,20\n화,25\n', 'a,b\n-3,1.5\n2,2e2\n', 'English,Korean\n', 'a,b\n007,hello\n008,world\n']:
            with tempfile.TemporaryDirectory() as folder:
                path = Path(folder) / 'test.csv'; path.write_text(csv_text, encoding='utf-8')
                actual = pd.read_csv(path)
                expected = reference.read_csv(io.StringIO(csv_text))
                self.assertEqual(actual.to_dict(), expected.to_dict())
        print('Reference parity: pandas', reference.__version__)


if __name__ == '__main__': unittest.main()

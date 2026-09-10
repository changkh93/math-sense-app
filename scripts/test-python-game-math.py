"""Numerical classroom compatibility against installed NumPy and native pandas."""
import importlib.util
from pathlib import Path
import sys
import unittest
sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('studio_pandas', ROOT / 'runtime/python-game-runner/studio_pandas.py')
pd = importlib.util.module_from_spec(spec); spec.loader.exec_module(pd)
try:
    import numpy as np
    import pandas as reference
except ImportError:
    np = reference = None


class MathLessons(unittest.TestCase):
    @unittest.skipIf(np is None, 'Native NumPy/pandas optional; real WASM QA covers this separately')
    def test_arrays_and_frame_parity(self):
        for source in [np.array([[34, 45, 76], [155, 164, 175]]), [(34, 45, 76), (155, 164, 175)], {'국어': np.array([34, 155]), '수학': np.array([45, 164]), '영어': np.array([76, 175])}]:
            args = dict(index=['왕새우', '새끼새우'], columns=['국어', '수학', '영어'])
            actual, expected = pd.DataFrame(source, **args), reference.DataFrame(source, **args)
            self.assertEqual(actual.to_dict(), expected.to_dict())
            self.assertEqual(actual.국어.dtype, str(expected.국어.dtype))
            self.assertEqual(actual.loc['왕새우'].to_dict(), expected.loc['왕새우'].to_dict())
            actual.loc['왕새우', '국어'] = 100
            expected.loc['왕새우', '국어'] = 100
            self.assertEqual(actual.to_dict(), expected.to_dict())
        values = np.zeros((24, 2)); values[:, 0] = np.arange(24); values[:, 1] = np.arange(24)+150
        self.assertEqual(pd.DataFrame(values).to_dict(), reference.DataFrame(values).to_dict())

    @unittest.skipIf(np is None, 'Native NumPy/pandas optional')
    def test_series_dtype_and_labels(self):
        for dtype in [int, float, 'int64', 'float64']:
            actual = pd.Series(np.array([3., 5., 2., 8., 4.]), index=list('abcde'), dtype=dtype)
            expected = reference.Series(np.array([3., 5., 2., 8., 4.]), index=list('abcde'), dtype=dtype)
            self.assertEqual(actual.to_dict(), expected.to_dict())
            self.assertEqual(actual.dtype, str(expected.dtype))
            self.assertEqual(actual['a'] + actual['b'], 8)
        self.assertEqual(pd.Series([1, 7, 3])[1], 7)

    def test_index_selection_and_writes(self):
        data = pd.DataFrame({'x': [1, 2, 3], 'y': [10, 20, 30]}, index=['a', 'b', 'c'])
        self.assertEqual(data.loc['a':'b'].index, ['a', 'b'])
        self.assertEqual(data.loc['c':'a':-1].index, ['c', 'b', 'a'])
        self.assertEqual(data.iloc[-1].to_dict(), {'x': 3, 'y': 30})
        self.assertEqual(data.iloc[:2, 0].tolist(), [1, 2])
        self.assertEqual(data.loc[data.x >= 2, ['y']].to_dict(), {'y': {'b': 20, 'c': 30}})
        data.loc[data.x >= 2, 'y'] = 99
        data.iloc[0, 0] = 5
        self.assertEqual(data.to_dict(), {'x': {'a': 5, 'b': 2, 'c': 3}, 'y': {'a': 10, 'b': 99, 'c': 99}})
        series = pd.Series([1, 2], index=['a', 'b']); series.iloc[0] = 7
        self.assertEqual(series.loc['a'], 7)
        for operation in [lambda: data.loc['missing'], lambda: data.iloc[9], lambda: series[0]]:
            with self.assertRaises((KeyError, IndexError)): operation()
        with self.assertRaises(NotImplementedError): data.loc['a', 'x'] = [1, 2]
        with self.assertRaises(ValueError): pd.DataFrame([[1, 2], [3]], columns=['x', 'y'])


if __name__ == '__main__': unittest.main()

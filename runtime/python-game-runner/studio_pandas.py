"""Browser classroom subset of pandas (not the native pandas package).

DataFrame/Series, CSV inference, selection, comparisons, basic aggregates and
local project CSV writes. Unsupported operations fail explicitly.
"""
import csv
import io
import math
import operator
import os
import re

__version__ = 'studio-classroom-subset-3'
__all__ = ['DataFrame', 'Series', 'read_csv']
_NA = {'', 'NA', 'N/A', 'NaN', 'nan', 'NULL', 'null', 'None', '<NA>'}


def _missing(value):
    return value is None or (isinstance(value, float) and math.isnan(value))


def _dtype(values):
    present = [v for v in values if not _missing(v)]
    if not present: return 'float64' if values else 'object'
    if all(type(v) is bool for v in present) and len(present) == len(values): return 'bool'
    if all(type(v) is int for v in present) and len(present) == len(values): return 'int64'
    if all(type(v) in (int, float) for v in present): return 'float64'
    return 'object'


def _scalar(value):
    # NumPy scalars become ordinary Python values without importing NumPy for CSV lessons.
    return value.item() if type(value).__module__.startswith('numpy') and getattr(value, 'ndim', None) == 0 else value


def _coerce(values):
    values = [_scalar(v) for v in values]
    if _dtype(values) == 'float64':
        return [float('nan') if _missing(v) else float(v) for v in values]
    return list(values)


def _display(value):
    if _missing(value): return 'NaN'
    text = str(value).replace('\n', r'\n').replace('\r', r'\r').replace('\t', r'\t')
    return text if len(text) <= 36 else text[:33] + '...'


def _width(text):
    # Korean/CJK characters occupy two cells in the studio's monospace console.
    return sum(2 if 0x1100 <= ord(c) <= 0x115f or 0x2e80 <= ord(c) <= 0xa4cf or 0xac00 <= ord(c) <= 0xd7a3 or 0xff01 <= ord(c) <= 0xff60 else 1 for c in text)


def _table(rows):
    widths = [max(_width(row[i]) for row in rows) for i in range(len(rows[0]))]
    lines, used = [], 0
    for row in rows:
        line = '  '.join(' ' * (width - _width(cell)) + cell for width, cell in zip(widths, row)).rstrip()
        used += len(line.encode('utf-8')) + 1
        if used > 6000:
            lines.append('... (출력 일부 생략)'); break
        lines.append(line)
    return '\n'.join(lines)


def _positions(length):
    return list(range(length)) if length <= 20 else list(range(10)) + [None] + list(range(length - 10, length))


def _mask(key, index):
    if isinstance(key, Series):
        if any(type(value) is not bool for value in key._values): raise TypeError('행 선택에는 참/거짓 조건을 사용해 주세요.')
        # Align by retained row labels, never silently zip unrelated positions.
        mapping = dict(zip(key.index, key._values))
        if any(label not in mapping for label in index): raise ValueError('조건과 데이터의 행 인덱스가 일치하지 않습니다.')
        return [mapping[label] for label in index]
    if isinstance(key, (list, tuple)) and all(type(value) is bool for value in key):
        if len(key) != len(index): raise ValueError('조건의 개수와 행의 개수가 같아야 합니다.')
        return list(key)
    raise TypeError('열 이름 또는 참/거짓 조건으로 데이터를 선택해 주세요.')


class Series:
    def __init__(self, data=None, index=None, name=None, dtype=None):
        values = [] if data is None else list(data)
        casts = {int: int, float: float, str: str, bool: bool, 'int': int, 'int64': int, 'float': float, 'float64': float, 'str': str, 'bool': bool}
        if dtype is not None:
            if dtype not in casts: raise NotImplementedError('Series dtype은 int, float, str, bool을 지원합니다.')
            values = [casts[dtype](v) for v in values]
        self._values = _coerce(values)
        self.index = list(range(len(self._values))) if index is None else list(index)
        if len(self.index) != len(self._values): raise ValueError('값과 인덱스의 길이가 다릅니다.')
        if len(set(self.index)) != len(self.index): raise NotImplementedError('수업용 Series는 중복 없는 인덱스를 지원합니다.')
        self.name = name

    @property
    def dtype(self): return _dtype(self._values)
    @property
    def shape(self): return (len(self),)
    @property
    def empty(self): return not len(self)
    def __len__(self): return len(self._values)
    def __iter__(self): return iter(self._values)
    def __bool__(self): raise ValueError('Series 전체를 if/and/or로 판단할 수 없습니다. 각 값의 비교 결과를 사용해 주세요.')

    def __getitem__(self, key):
        if isinstance(key, slice): return Series(self._values[key], self.index[key], self.name)
        if isinstance(key, (Series, list, tuple)):
            mask = _mask(key, self.index)
            return Series([v for v, keep in zip(self._values, mask) if keep], [i for i, keep in zip(self.index, mask) if keep], self.name)
        try: position = self.index.index(key)
        except ValueError: raise KeyError(key) from None
        return self._values[position]

    @property
    def loc(self): return _Indexer(self, False)
    @property
    def iloc(self): return _Indexer(self, True)
    def __setitem__(self, key, value): self.loc[key] = value

    def to_list(self): return list(self._values)
    tolist = to_list
    def to_dict(self): return dict(zip(self.index, self._values))
    def head(self, n=5): return self[:n]

    def _compare(self, other, op):
        if isinstance(other, Series):
            if self.index != other.index: raise ValueError('비교할 Series의 인덱스가 같아야 합니다.')
            right = other._values
        elif isinstance(other, (list, tuple)):
            if len(other) != len(self): raise ValueError('비교할 값의 개수가 다릅니다.')
            right = other
        else: right = [other] * len(self)
        values = [(op is operator.ne) if _missing(a) or _missing(b) else op(a, b) for a, b in zip(self._values, right)]
        return Series(values, self.index, self.name)

    def __eq__(self, other): return self._compare(other, operator.eq)
    def __ne__(self, other): return self._compare(other, operator.ne)
    def __lt__(self, other): return self._compare(other, operator.lt)
    def __le__(self, other): return self._compare(other, operator.le)
    def __gt__(self, other): return self._compare(other, operator.gt)
    def __ge__(self, other): return self._compare(other, operator.ge)

    def _logical(self, other, op):
        if any(type(v) is not bool for v in self._values) or not isinstance(other, Series) or any(type(v) is not bool for v in other._values):
            raise TypeError('&와 |는 참/거짓 Series끼리 사용해 주세요.')
        return self._compare(other, op)
    def __and__(self, other): return self._logical(other, operator.and_)
    def __or__(self, other): return self._logical(other, operator.or_)
    def __invert__(self):
        if any(type(v) is not bool for v in self._values): raise TypeError('~는 참/거짓 Series에 사용해 주세요.')
        return Series([not v for v in self._values], self.index, self.name)

    def _aggregate(self, operation, skipna):
        values = [v for v in self._values if not _missing(v)]
        if not skipna and len(values) != len(self): return float('nan')
        if operation in ('mean', 'sum') and any(not isinstance(v, (int, float)) for v in values):
            raise TypeError('평균과 합계는 숫자 열에서 구할 수 있습니다.')
        if operation == 'sum': return sum(values)
        if not values: return float('nan')
        if operation == 'mean': return sum(values) / len(values)
        return max(values) if operation == 'max' else min(values)

    def mean(self, skipna=True): return self._aggregate('mean', skipna)
    def max(self, skipna=True): return self._aggregate('max', skipna)
    def min(self, skipna=True): return self._aggregate('min', skipna)
    def sum(self, skipna=True): return self._aggregate('sum', skipna)

    def __repr__(self):
        rows = [['...', '...'] if i is None else [_display(self.index[i]), _display(self._values[i])] for i in _positions(len(self))]
        body = _table(rows) if rows else 'Series([])'
        return body + '\n' + (f'Name: {self.name}, ' if self.name is not None else '') + f'dtype: {self.dtype}'


class DataFrame:
    def __init__(self, data=None, columns=None, index=None):
        if isinstance(data, DataFrame):
            columns = data.columns if columns is None else columns
            index = data.index if index is None else index
            data = data.to_dict('records')
        if type(data).__module__.startswith('numpy') and hasattr(data, 'tolist'): data = data.tolist()
        if isinstance(data, dict):
            columns = list(data) if columns is None else list(columns)
            if any(not isinstance(v, (list, tuple, Series)) and not (type(v).__module__.startswith('numpy') and getattr(v, 'ndim', None) == 1) for v in data.values()):
                raise NotImplementedError('수업용 DataFrame은 열 이름과 리스트를 담은 사전을 지원합니다.')
            lengths = {len(v) for v in data.values()}
            if len(lengths) > 1: raise ValueError('모든 열의 리스트 길이가 같아야 합니다.')
            count = next(iter(lengths), len(index) if index is not None else 0)
            values = {key: list(value) for key, value in data.items()}
            rows = [{key: values[key][i] if key in values else float('nan') for key in columns} for i in range(count)]
        else:
            rows = [] if data is None else list(data)
            if rows and all(isinstance(row, (list, tuple)) for row in rows):
                columns = list(range(len(rows[0]))) if columns is None else list(columns)
                if any(len(row) != len(columns) for row in rows): raise ValueError('각 행과 열 이름의 길이가 같아야 합니다.')
                rows = [dict(zip(columns, row)) for row in rows]
            elif any(not isinstance(row, dict) for row in rows):
                raise NotImplementedError('DataFrame에는 사전, 행 목록 또는 2차원 배열을 넣어 주세요.')
            columns = list(columns) if columns is not None else list(dict.fromkeys(key for row in rows for key in row))
        self.columns = list(columns)
        if len(set(self.columns)) != len(self.columns): raise NotImplementedError('수업용 DataFrame은 중복 없는 열 이름을 지원합니다.')
        self.index = list(range(len(rows))) if index is None else list(index)
        if len(self.index) != len(rows): raise ValueError('행의 개수와 인덱스의 개수가 다릅니다.')
        if len(set(self.index)) != len(self.index): raise NotImplementedError('수업용 DataFrame은 중복 없는 인덱스를 지원합니다.')
        normalized = {key: _coerce([row.get(key, float('nan')) for row in rows]) for key in columns}
        self._rows = [{key: normalized[key][i] for key in columns} for i in range(len(rows))]

    def __len__(self): return len(self._rows)
    def __bool__(self): raise ValueError('DataFrame 전체를 if로 판단할 수 없습니다. len(data) 또는 data.empty를 사용해 주세요.')
    @property
    def shape(self): return (len(self), len(self.columns))
    @property
    def empty(self): return not len(self) or not len(self.columns)

    def __getitem__(self, key):
        if isinstance(key, str):
            if key not in self.columns: raise KeyError(key)
            return Series([row[key] for row in self._rows], self.index, key)
        if isinstance(key, (list, tuple)) and all(isinstance(v, str) for v in key):
            for column in key:
                if column not in self.columns: raise KeyError(column)
            return DataFrame(self._rows, columns=key, index=self.index)
        if isinstance(key, slice): return DataFrame(self._rows[key], columns=self.columns, index=self.index[key])
        mask = _mask(key, self.index)
        return DataFrame([row for row, keep in zip(self._rows, mask) if keep], self.columns, [i for i, keep in zip(self.index, mask) if keep])

    def __getattr__(self, name):
        if not name.startswith('_') and name in self.__dict__.get('columns', []): return self[name]
        raise AttributeError(f'DataFrame에 {name!r} 열 또는 지원 속성이 없습니다.')

    @property
    def loc(self): return _Indexer(self, False)
    @property
    def iloc(self): return _Indexer(self, True)
    def head(self, n=5): return self[:n]

    def to_dict(self, orient='dict'):
        if orient == 'records': return [dict(row) for row in self._rows]
        if orient == 'dict': return {key: dict(zip(self.index, [row[key] for row in self._rows])) for key in self.columns}
        if orient == 'list': return {key: [row[key] for row in self._rows] for key in self.columns}
        if orient == 'index': return {label: dict(row) for label, row in zip(self.index, self._rows)}
        if orient == 'split': return {'index': list(self.index), 'columns': list(self.columns), 'data': [[row[key] for key in self.columns] for row in self._rows]}
        raise NotImplementedError('to_dict는 dict, records, list, index, split 형식을 지원합니다.')

    def __repr__(self):
        if self.empty: return f'Empty DataFrame\nColumns: {[_display(v) for v in self.columns[:12]]}\nIndex: {[_display(v) for v in self.index[:20]]}'
        columns = self.columns[:12]
        table = [[''] + [_display(key) for key in columns]]
        for i in _positions(len(self)):
            table.append(['...'] * (len(columns) + 1) if i is None else [_display(self.index[i])] + [_display(self._rows[i][key]) for key in columns])
        result = _table(table)
        if len(self) > 20 or len(self.columns) > 12: result += f'\n[{len(self)} rows x {len(self.columns)} columns; 일부 표시]'
        return result

    def to_csv(self, path_or_buf=None, index=True, encoding='utf-8', **kwargs):
        if kwargs: raise NotImplementedError('현재 수업용 to_csv는 index와 encoding 옵션을 지원합니다.')
        buffer = io.StringIO(newline='')
        writer = csv.writer(buffer, lineterminator='\n')
        writer.writerow(([''] if index else []) + self.columns)
        for label, row in zip(self.index, self._rows):
            writer.writerow(([label] if index else []) + ['' if _missing(row[key]) else row[key] for key in self.columns])
        text = buffer.getvalue()
        if path_or_buf is None: return text
        if encoding not in ('utf-8', 'utf-8-sig'): raise ValueError('프로젝트 CSV는 UTF-8로 저장해 주세요.')
        path = os.path.abspath(os.fspath(path_or_buf))
        if not path.startswith('/tmp/studio/') or not path.lower().endswith('.csv'):
            raise ValueError('프로젝트 안의 .csv 상대경로로 저장해 주세요.')
        # The compact browser Python omits the utf-8-sig codec; handle BOM here.
        data = (b'\xef\xbb\xbf' if encoding == 'utf-8-sig' else b'') + text.encode('utf-8')
        if len(data) > 200 * 1024: raise ValueError('학습 기록 CSV는 200 KB까지 저장할 수 있습니다.')
        with open(path, 'wb') as output: output.write(data)
        _save_csv(path[len('/tmp/studio/'):], data)


class _Indexer:
    def __init__(self, owner, positional): self.owner, self.positional = owner, positional

    def _select(self, labels, key):
        if isinstance(key, slice):
            if self.positional: return list(range(len(labels)))[key], False
            step = 1 if key.step is None else key.step
            if step == 0: raise ValueError('slice step cannot be zero')
            start = (0 if step > 0 else len(labels)-1) if key.start is None else labels.index(key.start)
            stop = (len(labels)-1 if step > 0 else 0) if key.stop is None else labels.index(key.stop)
            return list(range(start, stop + (1 if step > 0 else -1), step)), False
        if isinstance(key, Series) or isinstance(key, (list, tuple)) and all(type(v) is bool for v in key):
            return [i for i, keep in enumerate(_mask(key, labels)) if keep], False
        multiple = isinstance(key, (list, tuple))
        values = key if multiple else [key]
        positions = []
        for value in values:
            if self.positional:
                if not isinstance(value, int): raise TypeError('iloc에는 정수 위치를 사용해 주세요.')
                position = value if value >= 0 else len(labels) + value
                if not 0 <= position < len(labels): raise IndexError(value)
            else:
                try: position = labels.index(value)
                except ValueError: raise KeyError(value) from None
            positions.append(position)
        return positions, not multiple

    def __getitem__(self, key):
        owner = self.owner
        if isinstance(owner, Series):
            rows, scalar = self._select(owner.index, key)
            return owner._values[rows[0]] if scalar else Series([owner._values[r] for r in rows], [owner.index[r] for r in rows], owner.name)
        row_key, col_key = key if isinstance(key, tuple) else (key, slice(None))
        rows, row_scalar = self._select(owner.index, row_key)
        cols, col_scalar = self._select(owner.columns, col_key)
        columns = [owner.columns[c] for c in cols]
        if row_scalar and col_scalar: return owner._rows[rows[0]][columns[0]]
        if row_scalar: return Series([owner._rows[rows[0]][c] for c in columns], columns, owner.index[rows[0]])
        if col_scalar: return Series([owner._rows[r][columns[0]] for r in rows], [owner.index[r] for r in rows], columns[0])
        return DataFrame([owner._rows[r] for r in rows], columns, [owner.index[r] for r in rows])

    def __setitem__(self, key, value):
        owner = self.owner
        if isinstance(value, (list, tuple, Series, DataFrame)) or getattr(value, 'ndim', 0) != 0:
            raise NotImplementedError('현재 loc/iloc 수정은 선택한 셀에 단일 값을 넣는 방식을 지원합니다.')
        value = _scalar(value)
        if isinstance(owner, Series):
            rows, _ = self._select(owner.index, key)
            for row in rows: owner._values[row] = value
            owner._values = _coerce(owner._values)
            return
        row_key, col_key = key if isinstance(key, tuple) else (key, slice(None))
        rows, _ = self._select(owner.index, row_key)
        cols, _ = self._select(owner.columns, col_key)
        for col in cols:
            column = owner.columns[col]
            values = _coerce([value if r in rows else record[column] for r, record in enumerate(owner._rows)])
            for record, item in zip(owner._rows, values): record[column] = item


def _infer(values, dtype):
    if dtype in (str, 'str', 'string'): return list(values)
    if dtype is not None: raise NotImplementedError('현재 read_csv dtype은 str 또는 열별 str 사전을 지원합니다.')
    present = [v for v in values if v not in _NA]
    if not present: return [float('nan')] * len(values)
    numeric = []
    for value in present:
        try:
            numeric.append(int(value) if re.fullmatch(r'[+-]?\d+', value.strip()) else float(value))
        except ValueError:
            break
    else:
        iterator = iter(numeric)
        return _coerce([float('nan') if v in _NA else next(iterator) for v in values])
    if all(v.lower() in ('true', 'false') for v in present):
        return [float('nan') if v in _NA else v.lower() == 'true' for v in values]
    return [float('nan') if v in _NA else v for v in values]


def read_csv(filepath_or_buffer, encoding='utf-8', dtype=None, **kwargs):
    if kwargs: raise NotImplementedError('현재 read_csv는 UTF-8 쉼표 구분 CSV, encoding, dtype을 지원합니다.')
    if encoding not in ('utf-8', 'utf-8-sig'): raise ValueError('프로젝트 CSV는 UTF-8로 저장해 주세요.')
    with open(filepath_or_buffer, encoding='utf-8', newline='') as source:
        rows = list(csv.reader(io.StringIO(source.read().removeprefix('\ufeff'), newline='')))
    rows = [row for row in rows if row]
    if not rows: raise ValueError('CSV에 열 이름이 없습니다. 첫 줄에 English,Korean 등을 넣어 주세요.')
    columns = []
    for number, name in enumerate(rows[0]):
        label = name or f'Unnamed: {number}'
        original, suffix = label, 1
        while label in columns:
            label = f'{original}.{suffix}'; suffix += 1
        columns.append(label)
    if any(len(row) != len(columns) for row in rows[1:]): raise ValueError('CSV의 각 행은 열 이름과 같은 수의 값을 가져야 합니다.')
    values = {key: _infer([row[i] for row in rows[1:]], dtype.get(key) if isinstance(dtype, dict) else dtype) for i, key in enumerate(columns)}
    return DataFrame(values)

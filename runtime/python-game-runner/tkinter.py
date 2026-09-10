"""Small browser Tk compatibility layer for the flash-card course.

The session driver pumps events; mainloop never blocks the browser thread.
Only the documented widget/options below are supported.
"""
import base64
import json
import struct
import time

__all__ = ['Tk', 'Canvas', 'PhotoImage', 'Button', 'mainloop', 'TclError',
           'NORMAL', 'DISABLED', 'CENTER', 'N', 'S', 'E', 'W', 'NW', 'NE', 'SW', 'SE']
NORMAL, DISABLED, CENTER = 'normal', 'disabled', 'center'
N, S, E, W, NW, NE, SW, SE = 'n', 's', 'e', 'w', 'nw', 'ne', 'sw', 'se'
_root = None
_serial = 0


class TclError(Exception):
    pass


def _id():
    global _serial
    _serial += 1
    return str(_serial)


def _send(op, **values):
    payload = base64.b64encode(json.dumps(dict(op=op, **values), ensure_ascii=True).encode()).decode()
    _bridge.studioTkCommand(payload)


def _options(values, allowed):
    values = dict(values)
    if 'background' in values:
        values['bg'] = values.pop('background')
    for key in values:
        if key not in allowed:
            raise TclError('현재 게임 스튜디오에서 지원하지 않는 tkinter 옵션: ' + key)
    return values


class Tk:
    def __init__(self):
        global _root
        if _root is not None and not _root._closed:
            raise TclError('현재 실행에서는 Tk 창을 하나만 만들 수 있습니다.')
        _root = self
        self._closed, self._loop = False, False
        self._timers, self._widgets = {}, {}
        _send('root')

    def title(self, string=None):
        if string is None:
            return getattr(self, '_title', '')
        self._title = str(string)
        _send('title', text=self._title)

    def config(self, cnf=None, **kwargs):
        values = _options({**(cnf or {}), **kwargs}, {'padx', 'pady', 'bg'})
        _send('config', id='root', values=values)

    configure = config

    def after(self, ms, func=None, *args):
        if not callable(func):
            raise TclError('after에는 실행할 함수를 넣어 주세요. 예: after(3000, flip_card)')
        key = 'after#' + _id()
        self._timers[key] = (time.monotonic() + max(0, float(ms)) / 1000, func, args)
        return key

    def after_cancel(self, id):
        if not id:
            raise ValueError('after_cancel에는 after가 돌려준 값을 넣어 주세요.')
        self._timers.pop(id, None)

    def mainloop(self, n=0):
        self._loop = not self._closed

    def quit(self):
        self._loop = False

    def destroy(self):
        self._closed, self._loop = True, False
        self._timers.clear()
        self._widgets.clear()
        _send('destroy')


def mainloop(n=0):
    if _root is not None:
        _root.mainloop(n)


class PhotoImage:
    def __init__(self, name=None, cnf=None, master=None, *, file=None, **kwargs):
        if kwargs or cnf or not file:
            raise TclError('PhotoImage(file="images/card.png") 형식을 사용해 주세요.')
        with open(file, 'rb') as source:
            data = source.read()
        if data[:8] != b'\x89PNG\r\n\x1a\n' or len(data) < 24:
            raise TclError('현재 PhotoImage는 PNG 이미지를 지원합니다.')
        self._width, self._height = struct.unpack('>II', data[16:24])
        if not (0 < self._width <= 8192 and 0 < self._height <= 8192) or len(data) > 5 * 1024 * 1024:
            raise TclError('이미지 크기는 8192픽셀, 파일은 5 MB 이하여야 합니다.')
        self._id = _id()
        _send('image', id=self._id, width=self._width, height=self._height,
              data=base64.b64encode(data).decode())

    def width(self): return self._width
    def height(self): return self._height


class _Widget:
    _allowed = {'width', 'height', 'bg', 'highlightthickness', 'highlightbackground'}

    def __init__(self, master=None, cnf=None, **kwargs):
        self.master = master or _root or Tk()
        if not isinstance(self.master, Tk) or self.master._closed:
            raise TclError('현재 위젯은 Tk 창 안에 배치해 주세요.')
        self._id = _id()
        self.master._widgets[self._id] = self
        self._command = None
        self._state = NORMAL
        _send('widget', id=self._id, kind=type(self).__name__)
        self.config(cnf, **kwargs)

    def config(self, cnf=None, **kwargs):
        values = _options({**(cnf or {}), **kwargs}, self._allowed)
        if 'state' in values:
            if values['state'] not in (NORMAL, DISABLED): raise TclError('버튼 state는 normal 또는 disabled입니다.')
            self._state = values['state']
        if 'command' in values:
            callback = values.pop('command')
            if callback is not None and not callable(callback):
                raise TclError('command에는 함수 이름을 넣어 주세요. 괄호는 붙이지 않습니다.')
            self._command = callback
        if 'image' in values:
            image = values['image']
            if not isinstance(image, PhotoImage): raise TclError('image에는 PhotoImage를 넣어 주세요.')
            values['image'] = image._id
        _send('config', id=self._id, values=values)

    configure = config

    def grid(self, cnf=None, **kwargs):
        values = _options({**(cnf or {}), **kwargs}, {'row', 'column', 'columnspan', 'rowspan', 'padx', 'pady', 'sticky'})
        for key in ('row', 'column', 'columnspan', 'rowspan'):
            if key in values and (not isinstance(values[key], int) or values[key] < (1 if key.endswith('span') else 0)):
                raise TclError('grid의 행·열은 0 이상, span은 1 이상의 정수입니다.')
        _send('grid', id=self._id, values=values)


class Button(_Widget):
    _allowed = _Widget._allowed | {'image', 'text', 'command', 'state', 'font', 'fg', 'padx', 'pady', 'borderwidth', 'relief'}


class Canvas(_Widget):
    def __init__(self, master=None, cnf=None, **kwargs):
        self._items = {}
        super().__init__(master, cnf, **kwargs)

    def _create(self, kind, x, y, values):
        key = len(self._items) + 1
        self._items[key] = kind
        _send('item', id=self._id, key=key, kind=kind, x=float(x), y=float(y))
        self.itemconfig(key, **values)
        return key

    def create_image(self, x, y, **kwargs): return self._create('image', x, y, kwargs)
    def create_text(self, x, y, **kwargs): return self._create('text', x, y, kwargs)

    def itemconfig(self, tagOrId, cnf=None, **kwargs):
        if tagOrId not in self._items: raise TclError('캔버스 항목 번호를 확인해 주세요.')
        kind = self._items[tagOrId]
        values = _options({**(cnf or {}), **kwargs}, {'image', 'anchor', 'state'} if kind == 'image' else {'text', 'font', 'fill', 'anchor', 'state'})
        if 'image' in values:
            if not isinstance(values['image'], PhotoImage): raise TclError('image에는 PhotoImage를 넣어 주세요.')
            values['image'] = values['image']._id
        _send('itemconfig', id=self._id, key=tagOrId, values=values)

    itemconfigure = itemconfig


def _busy():
    return _root is not None and _root._loop and not _root._closed


def _pump():
    events = json.loads(str(_bridge.studioTkTakeEvents()))
    if not _busy(): return
    root = _root
    for key in events[:64]:
        widget = root._widgets.get(str(key))
        if _busy() and isinstance(widget, Button) and widget._command and widget._state != DISABLED:
            widget._command()
    # Take one due timer at a time so a preceding callback can cancel it.
    for key in list(root._timers):
        item = root._timers.get(key)
        if _busy() and item and item[0] <= time.monotonic():
            del root._timers[key]
            item[1](*item[2])

"""MetaSense browser turtle subset; synchronous state, ordered SVG presentation.

Supports the introductory ColabTurtlePlus lessons and standard turtle spelling.
No Tk, IPython, network installation, or hidden state shared between runs.
"""
import math
import json


class TurtleGraphicsError(Exception):
    pass


_count = 0
_screen = None
_default = None


def _emit(op, **values):
    global _count
    _count += 1
    if _count > 20000:
        raise TurtleGraphicsError('그리기 명령이 너무 많습니다. 반복 횟수를 줄여 주세요.')
    _bridge.studioTurtleCommand(json.dumps(dict(op=op, **values)))


def _number(value):
    value = float(value)
    if not math.isfinite(value) or abs(value) > 1000000:
        raise TurtleGraphicsError('좌표와 크기는 -1000000부터 1000000 사이의 숫자여야 합니다.')
    return value


def _color(values):
    value = values[0] if len(values) == 1 else values
    if isinstance(value, str):
        value = ''.join(value.lower().split())
        if not _bridge.studioTurtleValidColor(value):
            raise TurtleGraphicsError('알 수 없는 색 이름: ' + value)
        return value
    if isinstance(value, (list, tuple)) and len(value) == 3:
        limit = Screen()._colormode
        rgb = [_number(v) for v in value]
        if any(v < 0 or v > limit for v in rgb):
            raise TurtleGraphicsError('색 숫자는 0부터 %s 사이여야 합니다.' % limit)
        return '#%02x%02x%02x' % tuple(round(v * 255 / limit) for v in rgb)
    raise TurtleGraphicsError('색 이름 또는 RGB 숫자 세 개를 넣어 주세요.')


class _Screen:
    def __init__(self):
        self._width, self._height, self._bg, self._colormode = 800, 600, 'white', 1.0
        self._turtles, self._tracer = [], 1
        _emit('screen', width=self._width, height=self._height, color=self._bg)

    def setup(self, width=800, height=600, startx=None, starty=None):
        width, height = _number(width), _number(height)
        if not (1 <= width <= 4096 and 1 <= height <= 4096):
            raise TurtleGraphicsError('화면 크기는 1부터 4096 픽셀 사이여야 합니다.')
        self._width, self._height = width, height
        _emit('screen', width=width, height=height, color=self._bg)

    def bgcolor(self, *args):
        if not args: return self._bg
        self._bg = _color(args)
        _emit('background', color=self._bg)

    def title(self, title): _emit('title', text=str(title))
    def window_width(self): return self._width
    def window_height(self): return self._height
    def turtles(self): return list(self._turtles)
    def colormode(self, cmode=None):
        if cmode is None: return self._colormode
        if cmode not in (1, 255): raise TurtleGraphicsError('colormode는 1 또는 255입니다.')
        self._colormode = cmode
    def tracer(self, n=None, delay=None):
        if n is None: return self._tracer
        self._tracer = max(0, int(n))
    def update(self): pass  # The host drains the drawing queue before completing a run.
    def mainloop(self): pass
    def exitonclick(self):
        raise TurtleGraphicsError('현재는 exitonclick 대신 done()을 사용해 주세요.')
    def clear(self): clearscreen()
    clearscreen = clear
    def reset(self):
        for turtle in self._turtles: turtle.reset()
    resetscreen = reset


def Screen():
    global _screen
    if _screen is None: _screen = _Screen()
    return _screen


def clearscreen():
    global _screen, _default
    _emit('clear-screen')
    _screen, _default = None, None
    Screen()


class Turtle:
    def __init__(self, shape='classic', undobuffersize=1000, visible=True):
        self.screen = Screen()
        self._id = len(self.screen._turtles)
        self.screen._turtles.append(self)
        self._x, self._y, self._heading = 0.0, 0.0, 0.0
        self._pen, self._width = True, 1.0
        self._pencolor, self._fillcolor = 'black', 'black'
        self._speed, self._shape, self._visible = 3, 'classic', bool(visible)
        self._fill, self._fill_id, self._fill_serial = None, None, 0
        self._scale = (1.0, 1.0)
        self.shape(shape)

    def _state(self):
        _emit('turtle', id=self._id, x=self._x, y=self._y, heading=self._heading,
              color=self._pencolor, fill=self._fillcolor, shape=self._shape,
              visible=self._visible, scale=self._scale)

    def _move(self, points, headings=None):
        headings = headings or [self._heading] * len(points)
        _emit('move', id=self._id, points=[[self._x, self._y]] + points,
              headings=[self._heading] + headings, pen=self._pen, width=self._width,
              color=self._pencolor, speed=self._speed if self.screen._tracer else 0)
        self._x, self._y = points[-1]
        self._heading = headings[-1] % 360
        if self._fill is not None: self._fill.extend(points)

    def forward(self, distance):
        distance = _number(distance)
        angle = math.radians(self._heading)
        self.goto(self._x + math.cos(angle) * distance, self._y + math.sin(angle) * distance)
    fd = forward
    def backward(self, distance): self.forward(-_number(distance))
    back = bk = backward
    def goto(self, x, y=None):
        if y is None: x, y = x
        self._move([[_number(x), _number(y)]])
    setpos = setposition = goto
    def setx(self, x): self.goto(x, self._y)
    def sety(self, y): self.goto(self._x, y)
    def left(self, angle):
        angle = _number(angle)
        _emit('turn', id=self._id, start=self._heading, angle=angle,
              speed=self._speed if self.screen._tracer else 0)
        self._heading = (self._heading + angle) % 360
    lt = left
    def right(self, angle): self.left(-_number(angle))
    rt = right
    def setheading(self, angle): self.left((_number(angle) - self._heading + 180) % 360 - 180)
    seth = setheading
    def heading(self): return self._heading
    def xcor(self): return self._x
    def ycor(self): return self._y
    def position(self): return (self._x, self._y)
    pos = position
    def home(self): self.goto(0, 0); self.setheading(0)
    def distance(self, x, y=None):
        if isinstance(x, Turtle): x, y = x.position()
        elif y is None: x, y = x
        return math.hypot(_number(x) - self._x, _number(y) - self._y)
    def towards(self, x, y=None):
        if isinstance(x, Turtle): x, y = x.position()
        elif y is None: x, y = x
        return math.degrees(math.atan2(_number(y)-self._y, _number(x)-self._x)) % 360

    def circle(self, radius, extent=None, steps=None):
        radius = _number(radius)
        extent = 360.0 if extent is None else _number(extent)
        if radius == 0: return
        steps = max(1, math.ceil(abs(extent) / 5)) if steps is None else int(steps)
        if not 1 <= steps <= 2000: raise TurtleGraphicsError('circle의 steps는 1부터 2000 사이여야 합니다.')
        angle = math.radians(self._heading)
        cx, cy = self._x - radius*math.sin(angle), self._y + radius*math.cos(angle)
        vx, vy = self._x-cx, self._y-cy
        turn = extent * (1 if radius >= 0 else -1)
        points, headings = [], []
        for i in range(1, steps+1):
            delta = math.radians(turn*i/steps)
            points.append([cx+vx*math.cos(delta)-vy*math.sin(delta), cy+vx*math.sin(delta)+vy*math.cos(delta)])
            headings.append(self._heading+turn*i/steps)
        self._move(points, headings)

    def penup(self): self._pen = False
    pu = up = penup
    def pendown(self): self._pen = True
    pd = down = pendown
    def isdown(self): return self._pen
    def pensize(self, width=None):
        if width is None: return self._width
        width = _number(width)
        if width < 0: raise TurtleGraphicsError('선 두께는 0 이상이어야 합니다.')
        self._width = width
    width = pensize
    def color(self, *args):
        if not args: return self._pencolor, self._fillcolor
        if len(args) == 2:
            pen, fill = _color((args[0],)), _color((args[1],))
        else: pen = fill = _color(args)
        self._pencolor, self._fillcolor = pen, fill
        self._state()
    def pencolor(self, *args):
        if not args: return self._pencolor
        self._pencolor = _color(args); self._state()
    def fillcolor(self, *args):
        if not args: return self._fillcolor
        self._fillcolor = _color(args); self._state()
    def begin_fill(self):
        if self._fill is not None: return
        self._fill_serial += 1
        self._fill_id = '%s-%s' % (self._id, self._fill_serial)
        self._fill = [[self._x, self._y]]
        _emit('begin-fill', id=self._id, key=self._fill_id)
    def end_fill(self):
        if self._fill is None: return
        _emit('end-fill', key=self._fill_id, points=self._fill, color=self._fillcolor)
        self._fill = None
    def filling(self): return self._fill is not None
    def speed(self, speed=None):
        if speed is None: return self._speed
        names = {'fastest': 0, 'fast': 10, 'normal': 6, 'slow': 3, 'slowest': 1}
        speed = names.get(speed, speed) if isinstance(speed, str) else speed
        speed = _number(speed)
        if not 0 <= speed <= 15: raise TurtleGraphicsError('속력은 0부터 15까지입니다. 0은 즉시 그리기입니다.')
        self._speed = speed
    def shape(self, name=None):
        if name is None: return self._shape
        if name not in ('classic', 'arrow', 'turtle', 'circle', 'square', 'triangle', 'blank'):
            raise TurtleGraphicsError('지원하지 않는 거북이 모양: ' + str(name))
        self._shape = name; self._state()
    def shapesize(self, stretch_wid=None, stretch_len=None, outline=None):
        if stretch_wid is None: return (*self._scale, self._width)
        stretch_len = stretch_wid if stretch_len is None else stretch_len
        self._scale = (_number(stretch_wid), _number(stretch_len))
        if min(self._scale) <= 0: raise TurtleGraphicsError('거북이 크기는 0보다 커야 합니다.')
        if outline is not None: self.pensize(outline)
        self._state()
    turtlesize = shapesize
    def hideturtle(self): self._visible = False; self._state()
    ht = hideturtle
    def showturtle(self): self._visible = True; self._state()
    st = showturtle
    def isvisible(self): return self._visible
    def write(self, arg, move=False, align='left', font=('Arial', 8, 'normal')):
        if align not in ('left', 'center', 'right'): raise TurtleGraphicsError('글씨 정렬은 left, center, right입니다.')
        family, size, style = font
        size = _number(size)
        if size <= 0: raise TurtleGraphicsError('글씨 크기는 0보다 커야 합니다.')
        text = str(arg)
        _emit('write', id=self._id, x=self._x, y=self._y, text=text, color=self._pencolor,
              align=align, family=str(family), size=size, style=str(style))
        if move:
            width = float(_bridge.studioTurtleTextWidth(text, str(family), size, str(style)))
            self.goto(self._x + width * (1 if align == 'left' else .5 if align == 'center' else 0), self._y)
    def dot(self, size=None, *color):
        size = max(self._width+4, self._width*2) if size is None else _number(size)
        if size < 0: raise TurtleGraphicsError('점 크기는 0 이상이어야 합니다.')
        _emit('dot', id=self._id, x=self._x, y=self._y, size=size, color=_color(color) if color else self._pencolor)
    def clear(self): _emit('clear-turtle', id=self._id)
    def reset(self):
        self.clear()
        self._x = self._y = self._heading = 0.0
        self._pen, self._width, self._speed = True, 1.0, 3
        self._pencolor = self._fillcolor = 'black'
        self._fill = None
        self._state()
    def getscreen(self): return self.screen
    def getturtle(self): return self
    getpen = getturtle


def _default_turtle():
    global _default
    if _default is None: _default = Turtle()
    return _default


def _procedure(name):
    def call(*args, **kwargs): return getattr(_default_turtle(), name)(*args, **kwargs)
    call.__name__ = name
    return call


for _name in dir(Turtle):
    if not _name.startswith('_') and callable(getattr(Turtle, _name)):
        globals()[_name] = _procedure(_name)


def setup(*args, **kwargs): return Screen().setup(*args, **kwargs)
def bgcolor(*args): return Screen().bgcolor(*args)
def title(text): return Screen().title(text)
def colormode(value=None): return Screen().colormode(value)
def tracer(n=None, delay=None): return Screen().tracer(n, delay)
def update(): return Screen().update()
def done(): return Screen().mainloop()
mainloop = done
resetscreen = lambda: Screen().reset()
window_width = lambda: Screen().window_width()
window_height = lambda: Screen().window_height()
def initializeTurtle(window=(800, 600), mode='standard', speed=5):
    if mode != 'standard': raise TurtleGraphicsError('현재 좌표 모드는 standard를 지원합니다.')
    clearscreen(); setup(*window); _default_turtle().speed(speed)

__all__ = ['Turtle', 'Screen', 'TurtleGraphicsError', 'clearscreen', 'resetscreen', 'setup',
           'bgcolor', 'title', 'colormode', 'tracer', 'update', 'done', 'mainloop',
           'window_width', 'window_height', 'initializeTurtle'] + [
               name for name in dir(Turtle) if not name.startswith('_') and callable(getattr(Turtle, name))]

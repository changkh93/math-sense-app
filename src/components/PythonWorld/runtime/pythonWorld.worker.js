const PYODIDE_VERSION = '0.29.4'
const PYODIDE_INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`

let pyodidePromise = null

const PYTHON_RUNNER = String.raw`
import ast
import contextlib
import io
import json
import math
import sys
import traceback
import types


class MissionLimitError(Exception):
    pass


def _json_value(value):
    if value is None or isinstance(value, (bool, int, float, str)):
        return value
    if isinstance(value, (list, tuple)):
        return [_json_value(item) for item in value[:20]]
    if isinstance(value, dict):
        return {str(key): _json_value(item) for key, item in list(value.items())[:20]}
    if hasattr(value, "snapshot"):
        return value.snapshot()
    text = repr(value)
    return text if len(text) <= 120 else text[:117] + "..."


def _analyze(tree):
    concepts = set()
    calls = set()
    violations = []
    for node in ast.walk(tree):
        if isinstance(node, ast.For):
            concepts.add("for")
        elif isinstance(node, ast.While):
            concepts.add("while")
        elif isinstance(node, ast.If):
            concepts.add("if")
        elif isinstance(node, ast.Compare):
            concepts.add("comparison")
        elif isinstance(node, ast.BoolOp):
            concepts.add("boolean")
        elif isinstance(node, ast.Return):
            concepts.add("return")
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            concepts.add("function")
        elif isinstance(node, ast.Assign):
            concepts.add("variable")
        elif isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
            if node.func.id == "range":
                concepts.add("range")
            if node.func.id in {"eval", "exec", "compile", "open", "__import__"}:
                violations.append(f"{node.func.id}() 함수는 Mission Lab에서 사용할 수 없습니다.")
        elif isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute):
            parts = []
            current = node.func
            while isinstance(current, ast.Attribute):
                parts.append(current.attr)
                current = current.value
            if isinstance(current, ast.Name):
                parts.append(current.id)
                calls.add(".".join(reversed(parts)))
        elif isinstance(node, ast.Import):
            violations.append("Mission Lab에서는 지정된 metasense 모듈만 불러올 수 있습니다.")
        elif isinstance(node, ast.ImportFrom) and node.module != "metasense":
            violations.append("Mission Lab에서는 지정된 metasense 모듈만 불러올 수 있습니다.")
    return sorted(concepts), sorted(calls), violations


def _run_mission(payload_json, code):
    mission = json.loads(payload_json)
    world_config = mission.get("world") or {}
    limits = mission.get("limits") or {}
    max_commands = int(limits.get("maxCommands", 200))
    max_trace_events = int(limits.get("maxTraceEvents", 1600))
    max_output_chars = int(limits.get("maxOutputChars", 5000))
    events = []
    command_count = 0

    class WorldState:
        def __init__(self, config):
            rover = config.get("rover") or {}
            target = config.get("target") or {}
            self.width = int(config.get("width", 8))
            self.height = int(config.get("height", 5))
            self.rover = {
                "x": int(rover.get("x", 0)),
                "y": int(rover.get("y", 0)),
                "direction": int(rover.get("direction", 0)) % 360,
                "energy": int(rover.get("energy", 100)),
            }
            self.max_energy = int(rover.get("maxEnergy", config.get("maxEnergy", 100)))
            self.target = {
                "x": int(target.get("x", 0)),
                "y": int(target.get("y", 0)),
                "kind": str(target.get("kind", "beacon")),
            }
            self.obstacles = {
                (int(item.get("x", -1)), int(item.get("y", -1)))
                for item in (config.get("obstacles") or [])
            }
            self.objects = []
            for index, item in enumerate(config.get("objects") or []):
                self.objects.append({
                    "id": str(item.get("id", f"object_{index + 1}")),
                    "kind": str(item.get("kind", "signal")),
                    "x": int(item.get("x", 0)),
                    "y": int(item.get("y", 0)),
                    "value": item.get("value", 1),
                    "strength": item.get("strength", 1),
                    "priority": item.get("priority", 1),
                    "collected": bool(item.get("collected", False)),
                })
            self.inventory = []

        @property
        def target_distance(self):
            return abs(self.target["x"] - self.rover["x"]) + abs(self.target["y"] - self.rover["y"])

        def snapshot(self):
            return {
                "width": self.width,
                "height": self.height,
                "rover": dict(self.rover),
                "target": dict(self.target),
                "objects": [dict(item) for item in self.objects],
                "inventory": [dict(item) for item in self.inventory],
                "collectedCount": len(self.inventory),
            }

    state = WorldState(world_config)

    class WorldObject:
        def __init__(self, object_id):
            self._id = str(object_id)

        def _data(self):
            return next((item for item in state.objects if item["id"] == self._id), None)

        @property
        def id(self):
            return self._id

        @property
        def kind(self):
            return self._data()["kind"] if self._data() else "unknown"

        @property
        def x(self):
            return self._data()["x"] if self._data() else -1

        @property
        def y(self):
            return self._data()["y"] if self._data() else -1

        @property
        def value(self):
            return self._data()["value"] if self._data() else None

        @property
        def strength(self):
            return self._data()["strength"] if self._data() else None

        @property
        def priority(self):
            return self._data()["priority"] if self._data() else None

        @property
        def position(self):
            return (self.x, self.y)

        def snapshot(self):
            return dict(self._data() or {"id": self._id})

        def __repr__(self):
            return f"Signal(kind={self.kind!r}, position={self.position})"

    def emit(event_type, **data):
        events.append({"type": event_type, "seq": len(events), **data})
        if len(events) > max_trace_events:
            raise MissionLimitError("실행 단계가 너무 많습니다.")

    class Rover:
        @property
        def x(self):
            return state.rover["x"]

        @property
        def y(self):
            return state.rover["y"]

        @property
        def energy(self):
            return state.rover["energy"]

        def snapshot(self):
            return dict(state.rover)

        def move(self, distance=1):
            nonlocal command_count
            if isinstance(distance, bool) or not isinstance(distance, (int, float)):
                raise TypeError("move()의 거리는 숫자여야 합니다.")
            distance = int(distance)
            if distance < 0 or distance > 50:
                raise ValueError("한 번에 이동할 수 있는 거리는 0~50칸입니다.")
            command_count += 1
            if command_count > max_commands:
                raise MissionLimitError("월드 명령 수가 안전 한도를 넘었습니다.")

            start = dict(state.rover)
            path = []
            blocked = False
            direction = state.rover["direction"] % 360
            delta = {
                0: (1, 0),
                90: (0, 1),
                180: (-1, 0),
                270: (0, -1),
            }.get(direction)
            if delta is None:
                raise ValueError("turn()은 90도의 배수로 사용해 주세요.")

            for _ in range(distance):
                nx = state.rover["x"] + delta[0]
                ny = state.rover["y"] + delta[1]
                if nx < 0 or ny < 0 or nx >= state.width or ny >= state.height or (nx, ny) in state.obstacles:
                    blocked = True
                    break
                if state.rover["energy"] <= 0:
                    blocked = True
                    break
                state.rover["x"] = nx
                state.rover["y"] = ny
                state.rover["energy"] -= 1
                path.append({"x": nx, "y": ny})

            emit(
                "world",
                action="move",
                start=start,
                end=dict(state.rover),
                path=path,
                blocked=blocked,
                reachedTarget=(state.rover["x"] == state.target["x"] and state.rover["y"] == state.target["y"]),
            )
            return not blocked

        def turn(self, degrees):
            nonlocal command_count
            if isinstance(degrees, bool) or not isinstance(degrees, (int, float)):
                raise TypeError("turn()의 각도는 숫자여야 합니다.")
            command_count += 1
            if command_count > max_commands:
                raise MissionLimitError("월드 명령 수가 안전 한도를 넘었습니다.")
            state.rover["direction"] = (state.rover["direction"] + int(degrees)) % 360
            emit("world", action="turn", degrees=int(degrees), end=dict(state.rover))

        def say(self, message):
            nonlocal command_count
            command_count += 1
            if command_count > max_commands:
                raise MissionLimitError("월드 명령 수가 안전 한도를 넘었습니다.")
            emit("world", action="say", message=str(message)[:120], end=dict(state.rover))

        def scan(self, radius=99):
            nonlocal command_count
            if isinstance(radius, bool) or not isinstance(radius, (int, float)):
                raise TypeError("scan()의 반경은 숫자여야 합니다.")
            command_count += 1
            if command_count > max_commands:
                raise MissionLimitError("월드 명령 수가 안전 한도를 넘었습니다.")
            radius = max(0, int(radius))
            found = [
                WorldObject(item["id"])
                for item in state.objects
                if not item["collected"] and abs(item["x"] - state.rover["x"]) + abs(item["y"] - state.rover["y"]) <= radius
            ]
            emit("world", action="scan", found=[item.snapshot() for item in found], end=dict(state.rover))
            return found

        def collect(self, obj):
            nonlocal command_count
            command_count += 1
            if command_count > max_commands:
                raise MissionLimitError("월드 명령 수가 안전 한도를 넘었습니다.")
            object_id = obj.id if isinstance(obj, WorldObject) else str(obj)
            item = next((candidate for candidate in state.objects if candidate["id"] == object_id), None)
            if item is None or item["collected"]:
                raise ValueError("수집할 수 있는 신호가 아닙니다.")
            distance = abs(item["x"] - state.rover["x"]) + abs(item["y"] - state.rover["y"])
            if distance > 1:
                raise ValueError("신호 가까이 이동한 뒤 collect()를 사용해 주세요.")
            item["collected"] = True
            state.inventory.append(dict(item))
            emit("world", action="collect", object=dict(item), inventoryCount=len(state.inventory), end=dict(state.rover))
            return True

        def charge(self):
            nonlocal command_count
            command_count += 1
            if command_count > max_commands:
                raise MissionLimitError("월드 명령 수가 안전 한도를 넘었습니다.")
            on_station = any(
                item["kind"] == "charge" and item["x"] == state.rover["x"] and item["y"] == state.rover["y"]
                for item in state.objects
            )
            if not on_station and not world_config.get("allowChargeAnywhere", False):
                raise ValueError("충전소 위치에서 charge()를 사용해 주세요.")
            before = state.rover["energy"]
            state.rover["energy"] = state.max_energy
            emit("world", action="charge", before=before, end=dict(state.rover))
            return state.rover["energy"]

    lumi = Rover()

    class World:
        @property
        def target_distance(self):
            return state.target_distance

        def snapshot(self):
            return state.snapshot()

        @property
        def objects(self):
            return [WorldObject(item["id"]) for item in state.objects if not item["collected"]]

    world = World()

    metasense = types.ModuleType("metasense")
    metasense.lumi = lumi
    metasense.world = world
    metasense.Rover = Rover
    sys.modules["metasense"] = metasense

    stdout = io.StringIO()
    concepts = []
    calls = []
    result_error = None
    student_globals = {}

    try:
        tree = ast.parse(code, filename="<student>", mode="exec")
        concepts, calls, violations = _analyze(tree)
        if violations:
            raise PermissionError(violations[0])

        allowed_builtins = {
            "__import__": __import__,
            "abs": abs,
            "bool": bool,
            "dict": dict,
            "enumerate": enumerate,
            "float": float,
            "int": int,
            "len": len,
            "list": list,
            "max": max,
            "min": min,
            "print": print,
            "range": range,
            "round": round,
            "set": set,
            "str": str,
            "sum": sum,
            "tuple": tuple,
            "zip": zip,
        }
        student_globals = {"__builtins__": allowed_builtins, "__name__": "__main__"}

        def trace_student(frame, event, arg):
            if frame.f_code.co_filename != "<student>":
                return trace_student
            if event == "line":
                variables = {
                    key: _json_value(value)
                    for key, value in frame.f_locals.items()
                    if not key.startswith("__") and key not in {"lumi", "world"}
                }
                emit(
                    "line",
                    line=int(frame.f_lineno),
                    variables=variables,
                    rover=dict(state.rover),
                )
            return trace_student

        compiled = compile(tree, "<student>", "exec")
        with contextlib.redirect_stdout(stdout):
            sys.settrace(trace_student)
            exec(compiled, student_globals, student_globals)
    except BaseException as exc:
        line = getattr(exc, "lineno", None)
        if line is None and exc.__traceback__ is not None:
            student_frames = [frame for frame in traceback.extract_tb(exc.__traceback__) if frame.filename == "<student>"]
            if student_frames:
                line = student_frames[-1].lineno
        result_error = {
            "type": type(exc).__name__,
            "message": str(exc),
            "line": line,
        }
    finally:
        sys.settrace(None)
        sys.modules.pop("metasense", None)

    return json.dumps({
        "events": events,
        "stdout": stdout.getvalue()[:max_output_chars],
        "conceptsUsed": concepts,
        "callsUsed": calls,
        "finalState": state.snapshot(),
        "commandCount": command_count,
        "error": result_error,
    }, ensure_ascii=False)


_run_mission(mission_payload_json, student_code)
`

async function loadRuntime() {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      self.postMessage({ type: 'status', status: 'loading', version: PYODIDE_VERSION })
      const module = await import(/* @vite-ignore */ `${PYODIDE_INDEX_URL}pyodide.mjs`)
      const runtime = await module.loadPyodide({ indexURL: PYODIDE_INDEX_URL })
      self.postMessage({ type: 'status', status: 'ready', version: PYODIDE_VERSION })
      return runtime
    })().catch((error) => {
      pyodidePromise = null
      throw error
    })
  }
  return pyodidePromise
}

self.addEventListener('message', async (event) => {
  const message = event.data || {}
  const requestId = message.requestId
  try {
    if (message.type === 'load') {
      await loadRuntime()
      self.postMessage({ type: 'loaded', requestId, version: PYODIDE_VERSION })
      return
    }

    if (message.type === 'run') {
      const pyodide = await loadRuntime()
      pyodide.globals.set('mission_payload_json', JSON.stringify(message.mission || {}))
      pyodide.globals.set('student_code', String(message.code || ''))
      try {
        const rawResult = await pyodide.runPythonAsync(PYTHON_RUNNER)
        self.postMessage({ type: 'result', requestId, result: JSON.parse(String(rawResult)) })
      } finally {
        pyodide.globals.delete('mission_payload_json')
        pyodide.globals.delete('student_code')
      }
    }
  } catch (error) {
    self.postMessage({
      type: 'worker-error',
      requestId,
      error: {
        type: error?.name || 'RuntimeError',
        message: error?.message || String(error),
      },
    })
  }
})

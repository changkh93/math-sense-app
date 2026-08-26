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
import tokenize
import traceback
import types


class MissionLimitError(Exception):
    pass


class InstanceRegistry:
    def __init__(self, max_instances=50):
        self._map = {}
        self._next_index = 1
        self._max_instances = max_instances

    def get_or_create(self, py_id, class_name):
        if py_id not in self._map:
            if len(self._map) >= self._max_instances:
                raise MissionLimitError(f"인스턴스 생성 한도({self._max_instances}개)를 초과했습니다.")
            assigned_id = f"instance-{self._next_index}"
            self._next_index += 1
            self._map[py_id] = assigned_id
        return self._map[py_id]

    def get_id(self, py_id):
        return self._map.get(py_id)


def _safe_clean_repr(text):
    import re
    # Remove raw pointer addresses like 'object at 0x10293847'
    return re.sub(r' at 0x[0-9a-fA-F]+>', '>', str(text))


def _json_value(value, depth=0, seen=None, instance_registry=None):
    if depth > 4:
        return "[Depth Limit]"
    if value is None or isinstance(value, (bool, int, float, str)):
        return value
    if isinstance(value, (list, tuple)):
        return [_json_value(item, depth + 1, seen, instance_registry) for item in value[:20]]
    if isinstance(value, dict):
        return {str(key): _json_value(item, depth + 1, seen, instance_registry) for key, item in list(value.items())[:20]}
    if hasattr(value, "snapshot") and callable(getattr(value, "snapshot")):
        try:
            return value.snapshot()
        except Exception:
            pass

    if isinstance(value, type):
        methods = [
            m for m in dir(value)
            if (not m.startswith("_") or m == "__init__") and callable(getattr(value, m, None))
        ]
        return {
            "kind": "python_class",
            "className": value.__name__,
            "methods": methods[:20],
        }

    # Custom Class Instance
    if hasattr(value, "__dict__") and not isinstance(value, (types.ModuleType, types.FunctionType, types.BuiltinFunctionType, types.MethodType)):
        if seen is None:
            seen = set()
        py_id = id(value)
        class_name = type(value).__name__
        if py_id in seen:
            return {"kind": "circular_ref", "className": class_name}

        inst_id = instance_registry.get_or_create(py_id, class_name) if instance_registry else "instance-1"
        attrs = {}
        child_seen = seen | {py_id}
        for k, v in list(value.__dict__.items())[:20]:
            if not k.startswith("_"):
                attrs[k] = _json_value(v, depth + 1, child_seen, instance_registry)
        return {
            "kind": "python_instance",
            "id": inst_id,
            "className": class_name,
            "publicAttributes": attrs,
        }

    text = _safe_clean_repr(repr(value))
    return text if len(text) <= 120 else text[:117] + "..."


def _analyze(tree, code=""):
    concepts = set()
    calls = set()
    violations = []
    class_count = 0
    classes_metadata = {}
    user_class_names = {
        node.name for node in ast.walk(tree)
        if isinstance(node, ast.ClassDef)
    }

    # Accurate comment detection via Python Tokenizer (not AST)
    try:
        tokens = list(tokenize.tokenize(io.BytesIO(code.encode("utf-8")).readline))
        for tok in tokens:
            if tok.type == tokenize.COMMENT:
                concepts.add("#")
                concepts.add("comment")
                break
    except Exception:
        pass

    for node in ast.walk(tree):
        if isinstance(node, ast.JoinedStr) or isinstance(node, ast.FormattedValue):
            concepts.add("f-string")
            concepts.add("format")
        elif isinstance(node, ast.ClassDef):
            class_count += 1
            if class_count > 10:
                violations.append("Class 정의는 최대 10개까지만 허용됩니다.")
            concepts.add("class")
            concepts.add("ClassDef")
            if node.decorator_list:
                violations.append("Class decorator는 사용할 수 없습니다.")
            if node.keywords:
                violations.append("Metaclass는 사용할 수 없습니다.")
            if len(node.bases) > 1:
                violations.append("다중 상속은 지원되지 않습니다.")
            base_class_name = None
            if len(node.bases) == 1:
                concepts.add("inheritance")
                if isinstance(node.bases[0], ast.Name):
                    base_class_name = node.bases[0].id
                    if base_class_name not in user_class_names:
                        violations.append("사용자가 정의한 안전한 클래스만 상속할 수 있습니다.")
                else:
                    violations.append("상속 대상은 사용자가 정의한 클래스 이름이어야 합니다.")

            init_params = []
            methods_meta = []
            for item in node.body:
                if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    params = [arg.arg for arg in item.args.args]
                    if item.name == "__init__":
                        concepts.add("__init__")
                        concepts.add("def")
                        init_params = [p for p in params if p != "self"]
                    elif item.name.startswith("__") and item.name.endswith("__"):
                        violations.append(f"{item.name} 특수 메서드는 사용할 수 없습니다. (허용: __init__)")
                    else:
                        concepts.add("method")
                        concepts.add("def")
                    methods_meta.append({"name": item.name, "parameters": params})
            classes_metadata[node.name] = {
                "className": node.name,
                "baseClassName": base_class_name,
                "initParameters": init_params,
                "methods": methods_meta,
            }
        elif isinstance(node, ast.For):
            concepts.add("for")
            if any(isinstance(child, ast.For) for child in ast.walk(node) if child is not node):
                concepts.add("nested_for")
        elif isinstance(node, ast.Constant):
            if isinstance(node.value, str):
                concepts.add("string")
                concepts.add("str")
        elif isinstance(node, (ast.List, ast.ListComp)):
            concepts.add("list")
        elif isinstance(node, ast.Dict):
            concepts.add("dict")
        elif isinstance(node, ast.Tuple):
            concepts.add("tuple")
        elif isinstance(node, ast.Subscript):
            concepts.add("subscript")
            concepts.add("indexing")
        elif isinstance(node, ast.While):
            concepts.add("while")
        elif isinstance(node, ast.Break):
            concepts.add("break")
        elif isinstance(node, ast.Continue):
            concepts.add("continue")
        elif isinstance(node, ast.If):
            concepts.add("if")
            if node.orelse:
                if len(node.orelse) == 1 and isinstance(node.orelse[0], ast.If):
                    concepts.add("elif")
                else:
                    concepts.add("else")
        elif isinstance(node, ast.Compare):
            concepts.add("comparison")
        elif isinstance(node, ast.BoolOp):
            concepts.add("boolean")
            if isinstance(node.op, ast.And):
                concepts.add("and")
            elif isinstance(node.op, ast.Or):
                concepts.add("or")
        elif isinstance(node, ast.Return):
            concepts.add("return")
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            concepts.add("function")
            concepts.add("def")
        elif isinstance(node, ast.Assign):
            concepts.add("variable")
        elif isinstance(node, ast.BinOp):
            if isinstance(node.op, ast.Add):
                concepts.add("+")
            elif isinstance(node.op, ast.Sub):
                concepts.add("-")
            elif isinstance(node.op, ast.Mult):
                concepts.add("*")
            elif isinstance(node.op, ast.Div):
                concepts.add("/")
        elif isinstance(node, ast.Attribute):
            if isinstance(node.value, ast.Name) and node.value.id == "self":
                concepts.add("self")
                concepts.add("self_attribute")
            if isinstance(node.value, ast.Name) and node.value.id == "world":
                concepts.add("sensor")
                calls.add(node.attr)
                calls.add("world." + node.attr)
            if isinstance(node.value, ast.Name) and node.value.id == "game":
                concepts.add("game")
                calls.add(node.attr)
                calls.add("game." + node.attr)
            if node.attr.startswith("__") and node.attr.endswith("__"):
                violations.append(f"내부 특성 '{node.attr}' 접근은 보안상 허용되지 않습니다.")
        elif isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
            calls.add(node.func.id)
            if node.func.id == "range":
                concepts.add("range")
            elif node.func.id == "print":
                concepts.add("print")
            elif node.func.id == "type":
                concepts.add("type")
            elif node.func.id == "input":
                concepts.add("input")
            elif node.func.id == "int":
                concepts.add("int")
            banned_funcs = {
                "eval", "exec", "compile", "open", "__import__",
                "getattr", "setattr", "id", "hasattr", "isinstance", "super", "__build_class__"
            }
            if node.func.id in banned_funcs:
                violations.append(f"{node.func.id}() 함수는 사용할 수 없습니다.")
        elif isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute):
            calls.add(node.func.attr)
            parts = []
            current = node.func
            while isinstance(current, ast.Attribute):
                parts.append(current.attr)
                current = current.value
            if isinstance(current, ast.Name):
                parts.append(current.id)
                full_call = ".".join(reversed(parts))
                calls.add(full_call)
                if full_call.startswith("game."):
                    concepts.add("game")
                if "blit" in full_call:
                    concepts.add("blit")
                if "draw" in full_call:
                    concepts.add("draw")
                if "render" in full_call:
                    concepts.add("render")
                if "sound" in full_call:
                    concepts.add("sound")
                if "music" in full_call:
                    concepts.add("music")
                if "key" in full_call or "pressed" in full_call:
                    concepts.add("key")
                if "collides" in full_call:
                    concepts.add("collision")
                if "clock" in full_call or "tick" in full_call:
                    concepts.add("clock")
                if "hud" in full_call:
                    concepts.add("hud")
                if "shield" in full_call:
                    concepts.add("shield")
        elif isinstance(node, ast.Import):
            violations.append("Mission Lab에서는 지정된 msense 모듈만 불러올 수 있습니다.")
        elif isinstance(node, ast.ImportFrom):
            if node.module in ("msense", "metasense"):
                concepts.add("import")
                concepts.add("from")
            else:
                violations.append("Mission Lab에서는 지정된 msense 모듈만 불러올 수 있습니다.")
    return sorted(concepts), sorted(calls), violations, classes_metadata


class _ConditionTransformer(ast.NodeTransformer):
    def visit_If(self, node):
        self.generic_visit(node)
        expr_str = "condition"
        try:
            expr_str = ast.unparse(node.test)
        except Exception:
            pass
        wrapped = ast.Call(
            func=ast.Name(id="_trace_condition", ctx=ast.Load()),
            args=[
                node.test,
                ast.Constant(value=getattr(node, "lineno", 1)),
                ast.Constant(value=expr_str)
            ],
            keywords=[]
        )
        node.test = wrapped
        return node


def _run_mission(payload_json, code):
    mission = json.loads(payload_json)
    world_config = mission.get("world") or {}
    limits = mission.get("limits") or {}
    max_commands = int(limits.get("maxCommands", 200))
    max_trace_events = int(limits.get("maxTraceEvents", 1600))
    max_output_chars = int(limits.get("maxOutputChars", 5000))
    events = []
    command_count = 0
    instance_registry = InstanceRegistry()
    latest_method_instance_snapshots = {}
    frame_stack = []
    frame_counter = 0

    input_queue = list(mission.get("inputValues") or [])

    trace_context = {
        "current_line": None,
        "last_line": None,
        "last_locals_snapshot": {},
        "active_frame_id": "main",
        "active_self_ref": None,
    }

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
                "awake": bool(rover.get("awake", True)),
            }
            self.max_energy = int(rover.get("maxEnergy", config.get("maxEnergy", 100)))
            self.target = {
                "x": int(target.get("x", 0)),
                "y": int(target.get("y", 0)),
                "kind": str(target.get("kind", "beacon")),
            }
            self.path_clear = bool(config.get("pathClear", True))
            self.survey_rows = max(1, min(10, int(config.get("surveyRows", 2))))
            self.survey_columns = max(1, min(10, int(config.get("surveyColumns", 3))))
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
            self.entity_specs = []
            for raw_spec in list(config.get("entitySpecs") or [])[:12]:
                if not isinstance(raw_spec, dict):
                    continue
                clean_spec = {}
                for raw_key, raw_value in list(raw_spec.items())[:20]:
                    key = str(raw_key)[:40]
                    if key.startswith("_"):
                        continue
                    if raw_value is None or isinstance(raw_value, (bool, int, float, str)):
                        clean_spec[key] = raw_value if not isinstance(raw_value, str) else raw_value[:120]
                self.entity_specs.append(clean_spec)
            self.inventory = []
            data_spec = config.get("data") if isinstance(config.get("data"), dict) else {}
            raw_signals = data_spec.get("signals") if "signals" in data_spec else config.get("signals", ["ALPHA", "BETA", "GAMMA"])
            self.signals = [str(s)[:120] for s in list(raw_signals or [])[:32]]

            raw_inv = data_spec.get("inventoryItems") if "inventoryItems" in data_spec else config.get("inventoryItems", ["crystal", "shield", "laser"])
            self.inventory_items = [str(s)[:120] for s in list(raw_inv or [])[:32]]

            raw_cells = data_spec.get("batteryCells") if "batteryCells" in data_spec else config.get("batteryCells", ["cell1", "cell2", "cell3"])
            self.battery_cells = [str(s)[:120] for s in list(raw_cells or [])[:32]]

            raw_packet = data_spec.get("dataPacket") if "dataPacket" in data_spec else config.get("dataPacket", "ENERGY:90|SHIELD:5|STATUS:SAFE")
            self.data_packet = str(raw_packet)[:300]

            raw_status = data_spec.get("statusData") if "statusData" in data_spec else config.get("statusData", {"name": "LUMI", "energy": 80, "shield": 5})
            clean_status = {}
            if isinstance(raw_status, dict):
                for k, v in list(raw_status.items())[:20]:
                    clean_status[str(k)[:40]] = v if not isinstance(v, str) else v[:120]
            self.status_data = clean_status

            self.incoming_pulse = bool(config.get("incomingPulse", False))
            self.pulse_distance = int(config.get("pulseDistance", 3))
            threat_cfg = str(config.get("threatType") or config.get("threat") or "")
            if not threat_cfg:
                if self.incoming_pulse:
                    threat_cfg = "pulse"
                elif config.get("mineAhead") or config.get("hasMine"):
                    threat_cfg = "mine"
                else:
                    threat_cfg = "none"
            self.threat_type = threat_cfg
            self.threat_distance = int(config.get("threatDistance", config.get("pulseDistance", 3)))
            self.enemies = [dict(e) for e in (config.get("enemies") or [])]
            self.enemy_detected = bool(config.get("enemyDetected", len(self.enemies) > 0 or self.incoming_pulse))
            self.key_sequence = list(mission.get("keySequence") or mission.get("inputTape") or [])
            self.game_state = {
                "inited": False,
                "running": False,
                "frame": 0,
                "skin": "default",
            }

        @property
        def target_distance(self):
            return abs(self.target["x"] - self.rover["x"]) + abs(self.target["y"] - self.rover["y"])

        @property
        def steps_to_target(self):
            return self.target_distance

        @property
        def obstacle_ahead_distance(self):
            cardinal_map = {
                0: (1, 0),
                90: (0, 1),
                180: (-1, 0),
                270: (0, -1),
            }
            direction = int(round(self.rover["direction"])) % 360
            delta = cardinal_map.get(direction)
            if delta is None:
                return -1
            max_distance = max(self.width, self.height)
            for distance in range(1, max_distance + 1):
                x = self.rover["x"] + delta[0] * distance
                y = self.rover["y"] + delta[1] * distance
                if x < 0 or y < 0 or x >= self.width or y >= self.height:
                    return -1
                if (x, y) in self.obstacles:
                    return distance
            return -1

        def snapshot(self):
            return {
                "width": self.width,
                "height": self.height,
                "rover": dict(self.rover),
                "target": dict(self.target),
                "pathClear": self.path_clear,
                "surveyRows": self.survey_rows,
                "surveyColumns": self.survey_columns,
                "objects": [dict(item) for item in self.objects],
                "inventory": [dict(item) for item in self.inventory],
                "collectedCount": len(self.inventory),
                "incomingPulse": self.incoming_pulse,
                "pulseDistance": self.pulse_distance,
                "enemies": [dict(e) for e in self.enemies],
                "gameState": dict(self.game_state),
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
        event_data = {"type": event_type, "seq": len(events), **data}
        if "sourceLine" not in event_data and trace_context["current_line"] is not None:
            event_data["sourceLine"] = trace_context["current_line"]
        if "frameId" not in event_data:
            event_data["frameId"] = trace_context["active_frame_id"]
        if event_type == "memory_changed" and data.get("receiverInstanceId"):
            after = data.get("after")
            if isinstance(after, dict) and after.get("kind") == "python_instance" and after.get("id"):
                latest_method_instance_snapshots[after["id"]] = after
        events.append(event_data)
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

        @property
        def awake(self):
            return state.rover.get("awake", True)

        @property
        def position(self):
            return (state.rover["x"], state.rover["y"])

        def snapshot(self):
            return dict(state.rover)

        def wake(self):
            nonlocal command_count
            command_count += 1
            if command_count > max_commands:
                raise MissionLimitError("월드 명령 수가 안전 한도를 넘었습니다.")
            state.rover["awake"] = True
            emit("world", action="wake", end=dict(state.rover))
            return True

        def move(self, distance=1):
            nonlocal command_count
            if isinstance(distance, bool) or not isinstance(distance, int):
                raise TypeError("move()의 거리는 정수여야 합니다. (예: lumi.move(3))")
            if distance < 0 or distance > 50:
                raise ValueError("한 번에 이동할 수 있는 거리는 0~50칸 사이의 정수입니다.")
            command_count += 1
            if command_count > max_commands:
                raise MissionLimitError("월드 명령 수가 안전 한도를 넘었습니다.")

            start = dict(state.rover)
            path = []
            blocked = False
            direction = int(round(state.rover["direction"])) % 360

            cardinal_map = {
                0: (1, 0),
                90: (0, 1),
                180: (-1, 0),
                270: (0, -1),
            }
            if direction not in cardinal_map:
                raise ValueError(f"방향 각도는 90도 단위(0, 90, 180, 270)여야 합니다. (현재: {direction}도)")

            delta = cardinal_map[direction]
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
                state.rover["energy"] = max(0, state.rover["energy"] - 1)
                path.append({"x": nx, "y": ny})

            reached = (state.rover["x"] == state.target["x"] and state.rover["y"] == state.target["y"])
            emit(
                "world",
                action="move",
                start=start,
                end=dict(state.rover),
                path=path,
                blocked=blocked,
                reachedTarget=reached,
            )
            return not blocked

        def turn(self, degrees=90):
            nonlocal command_count
            if isinstance(degrees, str):
                alias_map = {
                    "left": -90,
                    "right": 90,
                    "back": 180,
                    "u-turn": 180,
                    "around": 180,
                }
                deg_lower = degrees.strip().lower()
                if deg_lower in alias_map:
                    degrees = alias_map[deg_lower]
                else:
                    raise ValueError(f"알 수 없는 회전 방향입니다: '{degrees}'. 90, -90 또는 'left', 'right'를 입력해 주세요.")
            elif isinstance(degrees, bool) or not isinstance(degrees, int):
                raise TypeError("turn()의 각도는 90도 단위의 정수(예: 90, -90, 180) 또는 방향 별칭('left', 'right')이어야 합니다.")

            if degrees % 90 != 0:
                raise ValueError("turn()의 각도는 90도의 배수(-270, -180, -90, 90, 180, 270)여야 합니다.")

            command_count += 1
            if command_count > max_commands:
                raise MissionLimitError("월드 명령 수가 안전 한도를 넘었습니다.")

            new_dir = (int(round(state.rover["direction"])) + degrees) % 360
            if new_dir < 0:
                new_dir += 360
            state.rover["direction"] = new_dir
            emit("world", action="turn", degrees=degrees, end=dict(state.rover))
            return True

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

        def collect(self, obj=None):
            nonlocal command_count
            command_count += 1
            if command_count > max_commands:
                raise MissionLimitError("월드 명령 수가 안전 한도를 넘었습니다.")
            if obj is None:
                return self.collect_nearest()
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
            emit("energy_changed", entityId="lumi", fromEnergy=before, toEnergy=state.max_energy, reason="charge")
            emit("world", action="charge", before=before, end=dict(state.rover))
            return state.rover["energy"]

        def shield(self):
            nonlocal command_count
            command_count += 1
            if command_count > max_commands:
                raise MissionLimitError("월드 명령 수가 안전 한도를 넘었습니다.")
            state.rover["shield"] = True
            state.incoming_pulse = False
            emit("shield_raised", energy=state.rover["energy"], incomingPulse=False, end=dict(state.rover))
            emit("barrier_changed", id="active_gate", state="disabled")
            return True

        def dodge(self, direction="left"):
            nonlocal command_count
            command_count += 1
            if command_count > max_commands:
                raise MissionLimitError("월드 명령 수가 안전 한도를 넘었습니다.")
            emit("rover_dodged", direction=str(direction), end=dict(state.rover))
            return True

        def collect_nearest(self):
            nonlocal command_count
            command_count += 1
            if command_count > max_commands:
                raise MissionLimitError("월드 명령 수가 안전 한도를 넘었습니다.")
            uncollected = [item for item in state.objects if not item["collected"]]
            if not uncollected:
                raise ValueError("더 이상 수집할 신호가 없습니다.")
            uncollected.sort(key=lambda item: abs(item["x"] - state.rover["x"]) + abs(item["y"] - state.rover["y"]))
            target_item = uncollected[0]
            target_item["collected"] = True
            state.inventory.append(dict(target_item))
            emit("world", action="collect", object=dict(target_item), inventoryCount=len(state.inventory), end=dict(state.rover))
            return True

        def status(self, label, value):
            emit("lumi_status", label=str(label), value=str(value), end=dict(state.rover))
            return True

        def jam(self, enemy=None):
            nonlocal command_count
            command_count += 1
            if command_count > max_commands:
                raise MissionLimitError("월드 명령 수가 안전 한도를 넘었습니다.")
            emit("enemy_jammed", enemy=str(enemy) if enemy is not None else "drone", end=dict(state.rover))
            return True

        def pulse(self, enemy=None):
            nonlocal command_count
            command_count += 1
            if command_count > max_commands:
                raise MissionLimitError("월드 명령 수가 안전 한도를 넘었습니다.")
            emit("enemy_purified", enemy=str(enemy) if enemy is not None else "drone", end=dict(state.rover))
            return True

    lumi = Rover()

    class World:
        @property
        def target_distance(self):
            dist = state.target_distance
            emit("sensor_read", sensor="target_distance", value=dist)
            return dist

        @property
        def steps_to_target(self):
            steps = state.steps_to_target
            emit("sensor_read", sensor="steps_to_target", value=steps)
            return steps

        @property
        def path_clear(self):
            emit("sensor_read", sensor="path_clear", value=state.path_clear)
            return state.path_clear

        @property
        def threat_type(self):
            emit("sensor_read", sensor="threat_type", value=state.threat_type)
            return state.threat_type

        @property
        def threat_distance(self):
            emit("sensor_read", sensor="threat_distance", value=state.threat_distance)
            return state.threat_distance

        @property
        def signal_count(self):
            count = len(state.signals) if state.signals else len([item for item in state.objects if not item["collected"]])
            emit("sensor_read", sensor="signal_count", value=count)
            return count

        @property
        def target_x(self):
            return state.target["x"]

        @property
        def beacon_reached(self):
            reached = (state.rover["x"] == state.target["x"] and state.rover["y"] == state.target["y"])
            emit("sensor_read", sensor="beacon_reached", value=reached)
            return reached

        @property
        def obstacle_ahead_distance(self):
            distance = state.obstacle_ahead_distance
            emit("sensor_read", sensor="obstacle_ahead_distance", value=distance)
            return distance

        @property
        def survey_rows(self):
            emit("sensor_read", sensor="survey_rows", value=state.survey_rows)
            return state.survey_rows

        @property
        def survey_columns(self):
            emit("sensor_read", sensor="survey_columns", value=state.survey_columns)
            return state.survey_columns

        @property
        def incoming_pulse(self):
            emit("sensor_read", sensor="incoming_pulse", value=state.incoming_pulse)
            return state.incoming_pulse

        @property
        def pulse_distance(self):
            emit("sensor_read", sensor="pulse_distance", value=state.pulse_distance)
            return state.pulse_distance

        @property
        def enemy_detected(self):
            emit("sensor_read", sensor="enemy_detected", value=state.enemy_detected)
            return state.enemy_detected

        @property
        def emergency(self):
            is_emer = bool(state.incoming_pulse or not state.path_clear)
            emit("sensor_read", sensor="emergency", value=is_emer)
            return is_emer

        @property
        def enemies(self):
            emit("sensor_read", sensor="enemies", value=len(state.enemies))
            return [dict(item) for item in state.enemies]

        def snapshot(self):
            return state.snapshot()

        @property
        def objects(self):
            return [WorldObject(item["id"]) for item in state.objects if not item["collected"]]

        @property
        def entity_specs(self):
            emit("sensor_read", sensor="entity_specs", value=len(state.entity_specs))
            return [dict(item) for item in state.entity_specs]

        @property
        def signals(self):
            emit("sensor_read", sensor="signals", value={"kind": "list", "length": len(state.signals)})
            return list(state.signals)

        @property
        def inventory_items(self):
            emit("sensor_read", sensor="inventory_items", value={"kind": "list", "length": len(state.inventory_items)})
            return list(state.inventory_items)

        @property
        def battery_cells(self):
            emit("sensor_read", sensor="battery_cells", value={"kind": "list", "length": len(state.battery_cells)})
            return list(state.battery_cells)

        @property
        def data_packet(self):
            emit("sensor_read", sensor="data_packet", value={"kind": "str", "length": len(state.data_packet)})
            return str(state.data_packet)

        @property
        def status_data(self):
            emit("sensor_read", sensor="status_data", value={"kind": "dict", "keys": list(state.status_data.keys())})
            return dict(state.status_data)

        @property
        def target_pos(self):
            pos = (int(state.target["x"]), int(state.target["y"]))
            emit("sensor_read", sensor="target_pos", value={"kind": "tuple", "x": pos[0], "y": pos[1]})
            return pos

    world = World()

    def consume_game_command(limit_message="게임 명령 수가 안전 한도를 넘었습니다."):
        nonlocal command_count
        command_count += 1
        if command_count > max_commands:
            raise MissionLimitError(limit_message)

    def finite_number(value, label):
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(float(value)):
            raise TypeError(f"{label}에는 유한한 숫자를 사용해 주세요.")
        return float(value)

    def fixed_numeric_sequence(value, length, label):
        if not isinstance(value, (list, tuple)) or len(value) != length:
            raise TypeError(f"{label}에는 숫자 {length}개가 든 tuple 또는 list를 사용해 주세요.")
        return [finite_number(item, label) for item in value]

    def collision_box(value):
        if isinstance(value, WorldObject):
            return (float(value.x), float(value.y), 1.0, 1.0)
        if isinstance(value, str):
            match = next((item for item in state.objects + state.enemies if str(item.get("id")) == value), None)
            if match is None:
                raise ValueError(f"{value!r} 이름의 월드 객체를 찾을 수 없습니다.")
            value = match
        if isinstance(value, dict):
            position = value.get("position")
            x = value.get("x", position[0] if isinstance(position, (list, tuple)) and len(position) >= 2 else None)
            y = value.get("y", position[1] if isinstance(position, (list, tuple)) and len(position) >= 2 else None)
            if x is None or y is None:
                raise TypeError("충돌 대상 dictionary에는 x, y 좌표가 필요합니다.")
            width = value.get("width", value.get("w", 1))
            height = value.get("height", value.get("h", 1))
            return (finite_number(x, "x"), finite_number(y, "y"), finite_number(width, "width"), finite_number(height, "height"))
        if isinstance(value, (list, tuple)):
            if len(value) == 2:
                x, y = fixed_numeric_sequence(value, 2, "위치")
                return (x, y, 1.0, 1.0)
            if len(value) == 4:
                x, y, width, height = fixed_numeric_sequence(value, 4, "충돌 사각형")
                return (x, y, width, height)
        if hasattr(value, "x") and hasattr(value, "y"):
            return (
                finite_number(getattr(value, "x"), "x"),
                finite_number(getattr(value, "y"), "y"),
                finite_number(getattr(value, "width", 1), "width"),
                finite_number(getattr(value, "height", 1), "height"),
            )
        raise TypeError("충돌 대상은 (x, y), (x, y, width, height), 월드 객체 또는 좌표 dictionary여야 합니다.")

    class GameScreen:
        def blit(self, image, position=(0, 0)):
            consume_game_command()
            img_name = str(image)
            if not img_name or len(img_name) > 80:
                raise ValueError("이미지 이름은 1~80글자로 작성해 주세요.")
            if img_name.startswith("lumi_"):
                state.game_state["skin"] = img_name
            pos = tuple(fixed_numeric_sequence(position, 2, "이미지 위치")) if isinstance(position, (list, tuple)) else str(position)[:40]
            emit("screen_blitted", image=img_name, position=pos)
            return True

    class GameDraw:
        def rect(self, color, rect, width=0):
            consume_game_command()
            clean_rect = fixed_numeric_sequence(rect, 4, "사각형 영역")
            clean_width = int(finite_number(width, "테두리 두께"))
            if clean_rect[2] <= 0 or clean_rect[3] <= 0 or clean_width < 0:
                raise ValueError("사각형의 너비·높이는 0보다 크고 테두리 두께는 0 이상이어야 합니다.")
            emit("shape_drawn", shape="rect", color=str(color)[:40], rect=clean_rect, width=clean_width)
            return True

        def circle(self, color, center, radius, width=0):
            consume_game_command()
            clean_center = fixed_numeric_sequence(center, 2, "원의 중심")
            clean_radius = finite_number(radius, "반지름")
            clean_width = int(finite_number(width, "테두리 두께"))
            if clean_radius <= 0 or clean_width < 0:
                raise ValueError("원의 반지름은 0보다 크고 테두리 두께는 0 이상이어야 합니다.")
            emit("shape_drawn", shape="circle", color=str(color)[:40], center=clean_center, radius=clean_radius, width=clean_width)
            return True

    class GameText:
        def render(self, text, position="top-left", color=None):
            consume_game_command()
            pos = str(position)[:40] if isinstance(position, str) else fixed_numeric_sequence(position, 2, "텍스트 위치")
            emit("text_rendered", text=str(text)[:240], position=pos, color=str(color)[:40] if color else None)
            return True

    class GameHud:
        def bar(self, label, value, maximum=100, color=None):
            consume_game_command()
            clean_value = finite_number(value, "게이지 값")
            clean_maximum = finite_number(maximum, "게이지 최댓값")
            if clean_maximum <= 0:
                raise ValueError("게이지 최댓값은 0보다 커야 합니다.")
            emit("hud_bar_updated", label=str(label)[:40], value=clean_value, maximum=clean_maximum, color=str(color)[:40] if color else None)
            return True

    class GameSound:
        def play(self, name):
            consume_game_command()
            clean_name = str(name).strip()[:40]
            if not clean_name:
                raise ValueError("재생할 효과음 이름을 입력해 주세요.")
            emit("sound_played", name=clean_name)
            return True

    class GameMusic:
        def play(self, name):
            consume_game_command()
            clean_name = str(name).strip()[:40]
            if not clean_name:
                raise ValueError("재생할 배경음 이름을 입력해 주세요.")
            emit("music_played", name=clean_name)
            return True

    class GameKey:
        def pressed(self, key_name):
            consume_game_command()
            k = str(key_name).upper().strip()
            if k not in ("RIGHT", "LEFT", "UP", "DOWN", "SPACE", "ARROW_RIGHT", "ARROW_LEFT", "ARROW_UP", "ARROW_DOWN"):
                raise ValueError("키 이름은 RIGHT, LEFT, UP, DOWN, SPACE 중 하나를 사용해 주세요.")
            frame = state.game_state["frame"]
            is_pressed = False
            if state.key_sequence:
                if frame < len(state.key_sequence):
                    frame_keys = state.key_sequence[frame]
                    if isinstance(frame_keys, (list, set, tuple)):
                        is_pressed = k in [str(x).upper() for x in frame_keys]
                    elif isinstance(frame_keys, dict):
                        is_pressed = bool(frame_keys.get(k) or frame_keys.get(key_name))
                    elif isinstance(frame_keys, str):
                        is_pressed = (k == frame_keys.upper().strip())
                else:
                    is_pressed = False
            emit("key_checked", key=k, pressed=is_pressed, frame=frame)
            return is_pressed

    class GameClock:
        def tick(self, fps=10):
            consume_game_command("게임 루프 실행 한도를 넘었습니다.")
            if not state.game_state["inited"]:
                raise RuntimeError("game.clock.tick() 전에 game.init()으로 장면을 시작해 주세요.")
            clean_fps = int(finite_number(fps, "FPS"))
            if clean_fps < 1 or clean_fps > 60:
                raise ValueError("FPS는 1부터 60 사이의 정수를 사용해 주세요.")
            state.game_state["frame"] += 1
            max_frames = max(1, min(120, int(limits.get("maxFrames", 30))))
            if state.game_state["frame"] >= max_frames:
                state.game_state["running"] = False
            emit("clock_ticked", frame=state.game_state["frame"], fps=clean_fps)
            return state.game_state["frame"]

    class Game:
        def __init__(self):
            self.screen = GameScreen()
            self.draw = GameDraw()
            self.text = GameText()
            self.hud = GameHud()
            self.sound = GameSound()
            self.music = GameMusic()
            self.key = GameKey()
            self.clock = GameClock()

        def init(self):
            consume_game_command()
            state.game_state["inited"] = True
            state.game_state["running"] = True
            state.game_state["frame"] = 0
            emit("game_inited", width=state.width, height=state.height)
            return True

        def quit(self):
            consume_game_command()
            state.game_state["running"] = False
            emit("game_quitted", frame=state.game_state["frame"])
            return True

        @property
        def running(self):
            return state.game_state["running"]

        @property
        def frame(self):
            return state.game_state["frame"]

        def collides(self, a, b):
            consume_game_command()
            ax, ay, aw, ah = collision_box(a)
            bx, by, bw, bh = collision_box(b)
            if aw <= 0 or ah <= 0 or bw <= 0 or bh <= 0:
                raise ValueError("충돌 사각형의 너비와 높이는 0보다 커야 합니다.")
            is_col = ax < bx + bw and ax + aw > bx and ay < by + bh and ay + ah > by
            emit("collision_detected", a=str(a)[:120], b=str(b)[:120], collided=is_col)
            return is_col

    game = Game()

    msense = types.ModuleType("msense")
    msense.lumi = lumi
    msense.world = world
    msense.game = game
    msense.Rover = Rover
    msense.Game = Game
    sys.modules["msense"] = msense
    sys.modules["metasense"] = msense

    class SafeType:
        def __init__(self, name):
            self.__name__ = str(name)
        def __str__(self):
            return self.__name__
        def __repr__(self):
            return f"<class '{self.__name__}'>"
        def __eq__(self, other):
            if isinstance(other, str):
                return self.__name__ == other
            if isinstance(other, SafeType):
                return self.__name__ == other.__name__
            if isinstance(other, type):
                return self.__name__ == other.__name__
            return False

    def safe_type(val):
        """Safe single-argument type inspector returning class proxy with __name__."""
        name = type(val).__name__
        return SafeType(name)

    def safe_input(prompt=""):
        nonlocal input_queue
        p_str = str(prompt)[:100]
        emit("input_requested", prompt=p_str)
        if not input_queue:
            raise MissionLimitError("관제 입력 대기열이 비어 있습니다. 입력값을 제공해 주세요.")
        val = str(input_queue.pop(0))[:100]
        emit("input_received", prompt=p_str, value=val)
        return val

    def safe_import(name, globals=None, locals=None, fromlist=(), level=0):
        if level != 0 or (name != "msense" and name != "metasense"):
            raise PermissionError("Mission Lab에서는 msense 모듈만 불러올 수 있습니다.")
        return msense

    stdout = io.StringIO()
    concepts = []
    calls = []
    classes_metadata = {}
    result_error = None
    student_globals = {}
    try:
        tree = ast.parse(code, filename="<student>", mode="exec")
        concepts, calls, violations, classes_metadata = _analyze(tree, code)
        if violations:
            raise PermissionError(violations[0])

        allowed_builtins = {
            "__import__": safe_import,
            "__build_class__": __build_class__,
            "object": object,
            "abs": abs,
            "bool": bool,
            "dict": dict,
            "enumerate": enumerate,
            "float": float,
            "input": safe_input,
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
            "type": safe_type,
            "zip": zip,
        }

        def _trace_condition(val, line_no, expr_str):
            emit(
                "condition_evaluated",
                expression=str(expr_str)[:120],
                result=bool(val),
                sourceLine=int(line_no)
            )
            return val

        allowed_builtins["_trace_condition"] = _trace_condition
        is_act_0 = mission.get("actId") == "act-0-awakening" or str(mission.get("id", "")).startswith("lumi-vs-")
        auto_import = bool(mission.get("scaffold", {}).get("autoImport", is_act_0))

        student_globals = {
            "__builtins__": allowed_builtins,
            "__name__": "__main__",
        }
        if auto_import:
            student_globals["lumi"] = lumi
            student_globals["world"] = world

        frame_snapshots = {
            "main": {
                "last_line": None,
                "locals": {},
            }
        }

        def trace_student(frame, event, arg):
            nonlocal frame_counter
            if frame.f_code.co_filename != "<student>":
                return trace_student

            if event == "call":
                func_name = frame.f_code.co_name
                if func_name != "<module>":
                    frame_counter += 1
                    frame_id = f"frame_{frame_counter}"
                    is_method = "self" in frame.f_locals
                    receiver_id = None
                    if is_method:
                        self_val = frame.f_locals.get("self")
                        if self_val is not None:
                            receiver_id = instance_registry.get_or_create(id(self_val), type(self_val).__name__)

                    frame_info = {
                        "frameId": frame_id,
                        "callableKind": "method" if is_method else "function",
                        "functionName": func_name,
                        "receiverInstanceId": receiver_id,
                    }
                    frame_stack.append(frame_info)
                    trace_context["active_frame_id"] = frame_id
                    trace_context["active_self_ref"] = receiver_id
                    frame_snapshots[frame_id] = {
                        "last_line": int(frame.f_lineno),
                        "locals": {},
                    }
                    emit(
                        "frame_entered",
                        frameId=frame_id,
                        callableKind="method" if is_method else "function",
                        functionName=func_name,
                        receiverInstanceId=receiver_id,
                        sourceLine=int(frame.f_lineno),
                    )

            elif event == "return":
                func_name = frame.f_code.co_name
                if frame_stack and func_name != "<module>":
                    cur_frame_id = trace_context["active_frame_id"]
                    if cur_frame_id in frame_snapshots:
                        f_snap = frame_snapshots[cur_frame_id]
                        prev_line = f_snap["last_line"]
                        prev_locals = f_snap["locals"]
                        current_snapshots = {}
                        for k, v in frame.f_locals.items():
                            if not k.startswith("__") and k not in {"lumi", "world"}:
                                current_snapshots[k] = _json_value(v, depth=0, seen=None, instance_registry=instance_registry)
                        for k, cur_snap in current_snapshots.items():
                            old_snap = prev_locals.get(k)
                            if k not in prev_locals or old_snap != cur_snap:
                                emit(
                                    "memory_changed",
                                    sourceLine=prev_line or int(frame.f_lineno),
                                    name=k,
                                    before=old_snap,
                                    after=cur_snap,
                                    receiverInstanceId=trace_context["active_self_ref"],
                                )

                    exited_frame = frame_stack.pop()
                    emit(
                        "frame_exited",
                        frameId=exited_frame["frameId"],
                        functionName=func_name,
                        returnValue=_json_value(arg, depth=0, seen=None, instance_registry=instance_registry),
                        sourceLine=int(frame.f_lineno),
                    )
                    frame_snapshots.pop(exited_frame["frameId"], None)
                    if frame_stack:
                        top = frame_stack[-1]
                        trace_context["active_frame_id"] = top["frameId"]
                        trace_context["active_self_ref"] = top["receiverInstanceId"]
                    else:
                        trace_context["active_frame_id"] = "main"
                        trace_context["active_self_ref"] = None

            elif event == "line":
                cur_line = int(frame.f_lineno)
                cur_frame_id = trace_context["active_frame_id"]
                if cur_frame_id not in frame_snapshots:
                    frame_snapshots[cur_frame_id] = {
                        "last_line": None,
                        "locals": {},
                    }

                f_snap = frame_snapshots[cur_frame_id]
                current_snapshots = {}
                system_names = {"lumi", "world", "msense", "metasense", "Rover", "Game", "game"}
                for k, v in frame.f_locals.items():
                    if not k.startswith("__") and k not in system_names:
                        current_snapshots[k] = _json_value(v, depth=0, seen=None, instance_registry=instance_registry)

                if f_snap["last_line"] is not None:
                    prev_line = f_snap["last_line"]
                    prev_locals = f_snap["locals"]
                    for k, cur_snap in current_snapshots.items():
                        old_snap = prev_locals.get(k)
                        if k not in prev_locals or old_snap != cur_snap:
                            is_same_instance = (
                                cur_frame_id == "main"
                                and isinstance(old_snap, dict)
                                and isinstance(cur_snap, dict)
                                and old_snap.get("kind") == "python_instance"
                                and cur_snap.get("kind") == "python_instance"
                                and old_snap.get("id") == cur_snap.get("id")
                            )
                            if not is_same_instance:
                                emit(
                                    "memory_changed",
                                    sourceLine=prev_line,
                                    name=k,
                                    before=old_snap,
                                    after=cur_snap,
                                    receiverInstanceId=trace_context["active_self_ref"],
                                )

                f_snap["last_line"] = cur_line
                f_snap["locals"] = current_snapshots

                emit(
                    "line",
                    line=cur_line,
                    variables=current_snapshots,
                    rover=dict(state.rover),
                    activeFrameId=cur_frame_id,
                    receiverInstanceId=trace_context["active_self_ref"],
                )

            return trace_student

        try:
            transformer = _ConditionTransformer()
            tree = transformer.visit(tree)
            ast.fix_missing_locations(tree)
        except Exception:
            pass

        compiled = compile(tree, "<student>", "exec")
        with contextlib.redirect_stdout(stdout):
            sys.settrace(trace_student)
            exec(compiled, student_globals, student_globals)

        # Final pass for global mutations
        main_snap = frame_snapshots.get("main", {})
        prev_line = main_snap.get("last_line")
        prev_locals = main_snap.get("locals", {})
        system_names = {"lumi", "world", "msense", "metasense", "Rover", "Game", "game"}
        for k, v in student_globals.items():
            if not k.startswith("__") and k not in system_names:
                cur_snap = _json_value(v, depth=0, seen=None, instance_registry=instance_registry)
                old_snap = prev_locals.get(k)
                if k not in prev_locals or old_snap != cur_snap:
                    instance_id = cur_snap.get("id") if isinstance(cur_snap, dict) else None
                    already_emitted_by_method = (
                        instance_id
                        and isinstance(old_snap, dict)
                        and old_snap.get("kind") == "python_instance"
                        and old_snap.get("id") == instance_id
                        and latest_method_instance_snapshots.get(instance_id) == cur_snap
                    )
                    if not already_emitted_by_method:
                        emit(
                            "memory_changed",
                            sourceLine=prev_line or int(cur_line if 'cur_line' in locals() else 1),
                            name=k,
                            before=old_snap,
                            after=cur_snap,
                            receiverInstanceId=None,
                        )
    except BaseException as exc:
        line = getattr(exc, "lineno", None)
        if line is None and exc.__traceback__ is not None:
            student_frames = [f for f in traceback.extract_tb(exc.__traceback__) if f.filename == "<student>"]
            if student_frames:
                line = student_frames[-1].lineno
        result_error = {
            "type": type(exc).__name__,
            "message": str(exc),
            "line": line,
        }
    finally:
        sys.settrace(None)
        sys.modules.pop("msense", None)
        sys.modules.pop("metasense", None)

    sys_objs = {
        "lumi": {
            "kind": "python_instance",
            "id": "system-lumi",
            "className": "Rover",
            "publicAttributes": {
                "energy": state.rover["energy"],
                "direction": state.rover["direction"],
            },
            "methods": ["wake", "move", "turn", "say", "scan", "collect", "charge"],
        }
    }
    if student_globals.get("game") is game:
        sys_objs["game"] = {
            "kind": "python_instance",
            "id": "system-game",
            "className": "Game",
            "publicAttributes": {
                "frame": state.game_state.get("frame", 0),
            },
            "methods": ["init", "quit", "draw_rect", "draw_circle", "render_text", "collides"],
        }

    return json.dumps({
        "events": events,
        "stdout": stdout.getvalue()[:max_output_chars],
        "conceptsUsed": concepts,
        "callsUsed": calls,
        "classesMetadata": classes_metadata,
        "systemObjects": sys_objs,
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
      const missionPayload = { ...(message.mission || {}) }
      if (Array.isArray(message.inputValues)) {
        missionPayload.inputValues = message.inputValues
      }
      pyodide.globals.set('mission_payload_json', JSON.stringify(missionPayload))
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

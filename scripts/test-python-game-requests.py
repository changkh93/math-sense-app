"""Unit checks for Code Studio's browser requests compatibility layer."""

import ast
import asyncio
import base64
import json
import pathlib
import sys
import types
import unittest


ROOT = pathlib.Path(__file__).resolve().parents[1]
HTML = (ROOT / 'runtime/python-game-runner/index.html').read_text()
REQUESTS_SOURCE = (ROOT / 'runtime/python-game-runner/studio_requests.py').read_text()


class FakeBridge:
    def __init__(self):
        self.requests = []
        self.results = {}

    def studioFetchStart(self, request_id, encoded):
        request = json.loads(base64.b64decode(encoded).decode())
        self.requests.append(request)
        body = json.dumps({
            'answer': 42,
            'url': request['url'],
            'status': 'OK',
            'results': {
                'sunrise': '2024-06-01T05:12:48+09:00',
                'sunset': '2024-06-01T19:50:38+09:00',
            },
        }).encode()
        response = {
            'status': 200,
            'url': request['url'],
            'reason': 'OK',
            'headers': {'content-type': 'application/json; charset=utf-8'},
            'body': base64.b64encode(body).decode(),
        }
        self.results[request_id] = base64.b64encode(json.dumps(response).encode()).decode()

    def studioFetchTake(self, request_id):
        return self.results.get(request_id, '')

    def studioFetchEnd(self, request_id):
        self.results.pop(request_id, None)


def requests_module(bridge):
    module = types.ModuleType('requests')
    module.__dict__['_bridge'] = bridge
    exec(compile(REQUESTS_SOURCE, '/studio/requests.py', 'exec'), module.__dict__)
    return module


class RequestsCompatibilityTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.bridge = FakeBridge()
        self.requests = requests_module(self.bridge)
        self.previous = sys.modules.get('requests')
        sys.modules['requests'] = self.requests
        self.compiler = {'ast': ast, 'asyncio': asyncio, 'types': types}
        exec(HTML[HTML.index('class FrameCallFinder'):HTML.index('def cancel_user_callbacks')], self.compiler)

    async def asyncTearDown(self):
        if self.previous is None:
            sys.modules.pop('requests', None)
        else:
            sys.modules['requests'] = self.previous

    async def execute(self, source):
        namespace = {'__name__': '__main__'}
        code = self.compiler['compile_project'](source, '/tmp/studio/main.py', namespace)
        result = eval(code, namespace)
        if asyncio.iscoroutine(result):
            await result
        return namespace

    async def test_top_level_get_keeps_normal_requests_syntax(self):
        namespace = await self.execute(
            "import requests\n"
            "response = requests.get('https://example.test/items', params={'q': '한글'})\n"
            "response.raise_for_status()\n"
            "answer = response.json()['answer']\n"
        )
        self.assertEqual(namespace['answer'], 42)
        self.assertEqual(self.bridge.requests[0]['method'], 'GET')
        self.assertIn('q=%ED%95%9C%EA%B8%80', self.bridge.requests[0]['url'])

    async def test_alias_from_import_and_direct_function_are_lifted(self):
        namespace = await self.execute(
            "from requests import post as send\n"
            "def submit():\n"
            "    return send('https://example.test/items', json={'name': '로버'})\n"
            "response = submit()\n"
            "answer = response.json()['answer']\n"
        )
        self.assertEqual(namespace['answer'], 42)
        request = self.bridge.requests[0]
        self.assertEqual(request['method'], 'POST')
        self.assertEqual(json.loads(base64.b64decode(request['body']).decode()), {'name': '로버'})

    async def test_json_sunrise_and_iso_date_lesson_flow(self):
        namespace = await self.execute(
            "import json\n"
            "json_string = '{\"name\": \"John Doe\", \"age\": 30, \"city\": \"New York\"}'\n"
            "person = json.loads(json_string)\n"
            "new_data = {'name': 'Jane Smith', 'age': 25, 'city': 'London'}\n"
            "json_string = json.dumps(new_data)\n"
            "import requests\n"
            "parameters = {'lat': 37.48, 'lng': 126.54, 'date': '2024-06-01', 'formatted': 0, 'tzid': 'Asia/Seoul'}\n"
            "response = requests.get('https://api.sunrise-sunset.org/json', params=parameters)\n"
            "response.raise_for_status()\n"
            "data = response.json()\n"
            "sunrise = data['results']['sunrise']\n"
            "sunset = data['results']['sunset']\n"
            "date_list = sunrise.split('T')\n"
            "day = date_list[0]\n"
            "time = date_list[1].split('+')[0]\n"
        )
        self.assertEqual(namespace['person'], {'name': 'John Doe', 'age': 30, 'city': 'New York'})
        self.assertIsInstance(namespace['json_string'], str)
        self.assertEqual(namespace['sunrise'], '2024-06-01T05:12:48+09:00')
        self.assertEqual(namespace['sunset'], '2024-06-01T19:50:38+09:00')
        self.assertEqual((namespace['day'], namespace['time']), ('2024-06-01', '05:12:48'))


class RequestsPackageDetectionTest(unittest.TestCase):
    def test_requests_is_detected_without_preloading_native_socket_package(self):
        scope = {'ast': ast, 'json': json, 'base64': base64}
        exec(HTML[HTML.index('def project_packages'):HTML.index('class FrameCallFinder')], scope)
        source = base64.b64encode(b'import requests\nprint(requests.get("https://example.test"))').decode()
        self.assertEqual(scope['project_packages']({'files': [{'path': 'main.py', 'data': source}]}), {'requests'})


if __name__ == '__main__':
    unittest.main()

"""Small requests-compatible HTTP client for the browser Code Studio.

The CPython/WASM runtime cannot use requests' socket transport. The runner
injects a browser fetch bridge and rewrites direct requests calls to await it,
so ordinary lesson code can keep using requests.get(...).json().
"""

import base64
import asyncio
import json as _json
from urllib.parse import urlencode, urlsplit, urlunsplit


class RequestException(Exception):
    pass


class HTTPError(RequestException):
    pass


class ConnectionError(RequestException):
    pass


class Timeout(RequestException):
    pass


class TooManyRedirects(RequestException):
    pass


_request_number = 0


class Response:
    def __init__(self, payload):
        self.status_code = int(payload.get('status', 0))
        self.url = str(payload.get('url', ''))
        self.headers = {str(key).lower(): str(value) for key, value in payload.get('headers', {}).items()}
        self.reason = str(payload.get('reason', ''))
        self.content = base64.b64decode(payload.get('body', ''))
        encoding = _encoding_from_headers(self.headers) or 'utf-8'
        try:
            self.text = self.content.decode(encoding)
        except (LookupError, UnicodeDecodeError):
            self.text = self.content.decode('utf-8', errors='replace')

    @property
    def ok(self):
        return 200 <= self.status_code < 400

    def json(self, **kwargs):
        return _json.loads(self.text, **kwargs)

    def raise_for_status(self):
        if 400 <= self.status_code:
            message = f'{self.status_code} {self.reason}'.strip()
            if self.url:
                message += f' for url: {self.url}'
            error = HTTPError(message)
            error.response = self
            raise error


def _encoding_from_headers(headers):
    content_type = headers.get('content-type', '')
    for part in content_type.split(';')[1:]:
        key, _, value = part.strip().partition('=')
        if key.lower() == 'charset' and value:
            return value.strip('"\' ')
    return None


def _url_with_params(url, params):
    if not params:
        return str(url)
    parts = urlsplit(str(url))
    query = '&'.join(filter(None, (parts.query, urlencode(params, doseq=True))))
    return urlunsplit((parts.scheme, parts.netloc, parts.path, query, parts.fragment))


def _body_and_headers(data, json, headers):
    normalized = {str(key): str(value) for key, value in (headers or {}).items()}
    lowered = {key.lower() for key in normalized}
    if json is not None:
        body = _json.dumps(json, ensure_ascii=False).encode('utf-8')
        if 'content-type' not in lowered:
            normalized['Content-Type'] = 'application/json'
    elif data is None:
        body = b''
    elif isinstance(data, bytes):
        body = data
    elif isinstance(data, str):
        body = data.encode('utf-8')
    else:
        body = urlencode(data, doseq=True).encode('utf-8')
        if 'content-type' not in lowered:
            normalized['Content-Type'] = 'application/x-www-form-urlencoded'
    return body, normalized


async def request(method, url, *, params=None, data=None, json=None, headers=None,
                  timeout=10, allow_redirects=True, **kwargs):
    global _request_number
    if kwargs:
        unsupported = ', '.join(sorted(kwargs))
        raise TypeError(f'Code Studio requests에서 아직 지원하지 않는 옵션: {unsupported}')
    body, headers = _body_and_headers(data, json, headers)
    payload = {
        'method': str(method).upper(),
        'url': _url_with_params(url, params),
        'headers': headers,
        'body': base64.b64encode(body).decode('ascii'),
        'timeout': float(timeout) if timeout is not None else 10,
        'allowRedirects': bool(allow_redirects),
    }
    encoded = base64.b64encode(_json.dumps(payload, ensure_ascii=False).encode('utf-8')).decode('ascii')
    _request_number += 1
    request_id = f'requests-{_request_number}'
    try:
        _bridge.studioFetchStart(request_id, encoded)
        while True:
            result = str(_bridge.studioFetchTake(request_id))
            if result:
                break
            await asyncio.sleep(.01)
    except Exception as error:
        message = str(error)
        if '시간이 초과' in message or 'timeout' in message.lower():
            raise Timeout(message) from error
        raise ConnectionError(message) from error
    finally:
        _bridge.studioFetchEnd(request_id)
    decoded = _json.loads(base64.b64decode(result).decode('utf-8'))
    if decoded.get('error'):
        error_type = Timeout if decoded.get('kind') == 'timeout' else ConnectionError
        raise error_type(decoded['error'])
    return Response(decoded)


async def get(url, params=None, **kwargs):
    return await request('GET', url, params=params, **kwargs)


async def options(url, **kwargs):
    return await request('OPTIONS', url, **kwargs)


async def head(url, **kwargs):
    return await request('HEAD', url, **kwargs)


async def post(url, data=None, json=None, **kwargs):
    return await request('POST', url, data=data, json=json, **kwargs)


async def put(url, data=None, json=None, **kwargs):
    return await request('PUT', url, data=data, json=json, **kwargs)


async def patch(url, data=None, json=None, **kwargs):
    return await request('PATCH', url, data=data, json=json, **kwargs)


async def delete(url, **kwargs):
    return await request('DELETE', url, **kwargs)

// ============================================================
// XMLHttpRequest Polyfill for Manifest V3 Service Worker
// ============================================================
// Manifest V3의 Service Worker에는 XMLHttpRequest가 없습니다.
// Firebase SDK는 내부적으로 XHR을 사용하므로, fetch 기반 폴리필이 필수입니다.
// ============================================================

if (typeof XMLHttpRequest === 'undefined') {
  class XMLHttpRequest {
    constructor() {
      this.readyState = 0;
      this.status = 0;
      this.statusText = '';
      this.responseText = '';
      this.response = '';
      this.responseType = '';
      this.responseURL = '';
      this.timeout = 0;
      this.withCredentials = false;
      this.onreadystatechange = null;
      this.onload = null;
      this.onerror = null;
      this.onabort = null;
      this.ontimeout = null;
      this.onprogress = null;
      this.onloadend = null;
      this.upload = {
        onprogress: null,
        onload: null,
        onerror: null,
        addEventListener: () => {},
        removeEventListener: () => {},
      };
      this._headers = {};
      this._responseHeaders = {};
      this._method = '';
      this._url = '';
      this._body = null;
      this._aborted = false;
      this._eventListeners = {};
    }

    open(method, url, async = true) {
      this._method = method;
      this._url = url;
      this.readyState = 1;
      this._fireReadyStateChange();
    }

    setRequestHeader(name, value) {
      this._headers[name] = value;
    }

    getResponseHeader(name) {
      return this._responseHeaders[name.toLowerCase()] || null;
    }

    getAllResponseHeaders() {
      return Object.entries(this._responseHeaders)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\r\n');
    }

    addEventListener(event, fn) {
      if (!this._eventListeners[event]) this._eventListeners[event] = [];
      this._eventListeners[event].push(fn);
    }

    removeEventListener(event, fn) {
      if (this._eventListeners[event]) {
        this._eventListeners[event] = this._eventListeners[event].filter(f => f !== fn);
      }
    }

    _fireEvent(event, detail) {
      const handlers = this._eventListeners[event] || [];
      const evt = { type: event, target: this, currentTarget: this, ...detail };
      handlers.forEach(fn => fn(evt));
    }

    _fireReadyStateChange() {
      if (this.onreadystatechange) {
        this.onreadystatechange({ type: 'readystatechange', target: this });
      }
      this._fireEvent('readystatechange');
    }

    send(body) {
      if (this._aborted) return;
      this._body = body;

      const fetchOptions = {
        method: this._method,
        headers: this._headers,
      };

      // body 처리
      if (body !== null && body !== undefined && this._method !== 'GET' && this._method !== 'HEAD') {
        fetchOptions.body = body;
      }

      this.readyState = 2;
      this._fireReadyStateChange();

      fetch(this._url, fetchOptions)
        .then(async (res) => {
          if (this._aborted) return;

          this.status = res.status;
          this.statusText = res.statusText;
          this.responseURL = res.url;

          // 응답 헤더 수집
          this._responseHeaders = {};
          res.headers.forEach((value, key) => {
            this._responseHeaders[key.toLowerCase()] = value;
          });

          this.readyState = 3;
          this._fireReadyStateChange();

          // 응답 본문 읽기
          let responseData;
          if (this.responseType === 'arraybuffer') {
            responseData = await res.arrayBuffer();
            this.response = responseData;
            this.responseText = '';
          } else if (this.responseType === 'blob') {
            responseData = await res.blob();
            this.response = responseData;
          } else {
            responseData = await res.text();
            this.responseText = responseData;
            this.response = responseData;
          }

          this.readyState = 4;
          this._fireReadyStateChange();

          if (this.onload) this.onload({ type: 'load', target: this });
          this._fireEvent('load');
          if (this.onloadend) this.onloadend({ type: 'loadend', target: this });
          this._fireEvent('loadend');
        })
        .catch((err) => {
          if (this._aborted) return;
          this.status = 0;
          this.readyState = 4;
          this._fireReadyStateChange();
          if (this.onerror) this.onerror({ type: 'error', target: this, error: err });
          this._fireEvent('error');
          if (this.onloadend) this.onloadend({ type: 'loadend', target: this });
          this._fireEvent('loadend');
        });
    }

    abort() {
      this._aborted = true;
      this.readyState = 0;
      if (this.onabort) this.onabort({ type: 'abort', target: this });
      this._fireEvent('abort');
    }
  }

  XMLHttpRequest.UNSENT = 0;
  XMLHttpRequest.OPENED = 1;
  XMLHttpRequest.HEADERS_RECEIVED = 2;
  XMLHttpRequest.LOADING = 3;
  XMLHttpRequest.DONE = 4;

  globalThis.XMLHttpRequest = XMLHttpRequest;
}

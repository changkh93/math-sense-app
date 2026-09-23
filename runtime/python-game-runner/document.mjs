// Build one self-contained document for both the app and standalone runner.
export function buildRunnerDocument(html, turtlePython, turtleRenderer, tkPython, tkRenderer, pandasPython, plotPython = '', plotRenderer = '', plotFont = '', studioFontsPython = '', requestsPython = '', presentationHost = '') {
  return html
    .replace('<!-- STUDIO_PRESENTATION_HOST -->', () => `<script>${presentationHost}</script>`)
    .replace('<!-- STUDIO_PLOT_RENDERER -->', () => `<script>${plotRenderer}</script>`)
    .replace('__STUDIO_PLOT_SOURCE__', () => JSON.stringify(plotPython).replaceAll('<', '\\u003c'))
    .replace('__STUDIO_PLOT_FONT__', () => JSON.stringify(plotFont))
    .replace('__STUDIO_FONTS_SOURCE__', () => JSON.stringify(studioFontsPython).replaceAll('<', '\\u003c'))
    .replace('__STUDIO_REQUESTS_SOURCE__', () => JSON.stringify(requestsPython).replaceAll('<', '\\u003c'))
    .replace('<!-- STUDIO_TK_RENDERER -->', () => `<script>${tkRenderer}</script>`)
    .replace('__STUDIO_TK_SOURCE__', () => JSON.stringify(tkPython).replaceAll('<', '\\u003c'))
    .replace('__STUDIO_PANDAS_SOURCE__', () => JSON.stringify(pandasPython).replaceAll('<', '\\u003c'))
    .replace('<!-- STUDIO_TURTLE_RENDERER -->', () => `<script>${turtleRenderer}</script>`)
    .replace('__STUDIO_TURTLE_SOURCE__', () => JSON.stringify(turtlePython).replaceAll('<', '\\u003c'))
}

export function buildPresentationDocument(html, turtleRenderer, tkRenderer, plotRenderer, client) {
  const style = html.match(/<style>([\s\S]*?)<\/style>/)[1]
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:"><title>실행 화면</title><style>${style}</style><script>${turtleRenderer}</script><script>${tkRenderer}</script><script>${plotRenderer}</script></head><body><canvas id="canvas" width="1200" height="700" tabindex="0"></canvas><div id="start"><div id="note">실행 화면을 연결하고 있습니다…</div></div><script>${client}</script></body></html>`
}

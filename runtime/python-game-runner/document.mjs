// Build one self-contained document for both the app and standalone runner.
export function buildRunnerDocument(html, turtlePython, turtleRenderer, tkPython, tkRenderer, pandasPython, plotPython = '', plotRenderer = '', plotFont = '') {
  return html
    .replace('<!-- STUDIO_PLOT_RENDERER -->', () => `<script>${plotRenderer}</script>`)
    .replace('__STUDIO_PLOT_SOURCE__', () => JSON.stringify(plotPython).replaceAll('<', '\\u003c'))
    .replace('__STUDIO_PLOT_FONT__', () => JSON.stringify(plotFont))
    .replace('<!-- STUDIO_TK_RENDERER -->', () => `<script>${tkRenderer}</script>`)
    .replace('__STUDIO_TK_SOURCE__', () => JSON.stringify(tkPython).replaceAll('<', '\\u003c'))
    .replace('__STUDIO_PANDAS_SOURCE__', () => JSON.stringify(pandasPython).replaceAll('<', '\\u003c'))
    .replace('<!-- STUDIO_TURTLE_RENDERER -->', () => `<script>${turtleRenderer}</script>`)
    .replace('__STUDIO_TURTLE_SOURCE__', () => JSON.stringify(turtlePython).replaceAll('<', '\\u003c'))
}

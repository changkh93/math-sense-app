// Build one self-contained document for both the app and standalone runner.
export function buildRunnerDocument(html, turtlePython, turtleRenderer) {
  return html
    .replace('<!-- STUDIO_TURTLE_RENDERER -->', () => `<script>${turtleRenderer}</script>`)
    .replace('__STUDIO_TURTLE_SOURCE__', () => JSON.stringify(turtlePython).replaceAll('<', '\\u003c'))
}

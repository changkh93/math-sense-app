import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { transform } from 'esbuild'
import { JSDOM } from 'jsdom'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import {
  canVisitCrewRoute,
  getCrewGates,
  getCrewHelpTasks,
} from '../src/components/GalaxySocial/frontierCrewRoutes.js'

const require = createRequire(import.meta.url)
const routes = [
  {
    uid: 'friend',
    displayName: '친구',
    planetName: '친구 행성',
    visitMode: 'crew',
  },
  { uid: 'private', displayName: '휴식', visitMode: 'private' },
  { uid: 'blocked', displayName: '차단', visitMode: 'crew', blocked: true },
]
assert.equal(canVisitCrewRoute(routes[0], 'me'), true)
for (const route of [routes[1], routes[2], {}, { uid: 'unknown' }])
  assert.equal(canVisitCrewRoute(route, 'me'), false)
assert.equal(canVisitCrewRoute(routes[0], 'friend'), false)
for (const radius of [20, 28.284])
  for (const gate of getCrewGates(radius)) {
    assert.ok(
      Math.hypot(gate.position[0], gate.position[2]) > radius,
      'outside land',
    )
    assert.ok(
      Math.hypot(gate.position[0], gate.position[2]) < radius + 60,
      'inside existing exploration bounds',
    )
    assert.ok(gate.position[1] >= -36 && gate.position[1] <= 24)
    assert.equal(
      gate.kind,
      'crew-gate',
      'must not dispatch a reward/resource action',
    )
  }
const layout = [
  { instanceId: 'g', itemId: 'friend_greenhouse', name: '우리 온실' },
  { instanceId: 'o', itemId: 'observatory', locked: true },
  { instanceId: 'b', itemId: 'astra_builder_plot' },
]
assert.deepEqual(
  getCrewHelpTasks(layout).map((task) => task.item.instanceId),
  ['g'],
)
assert.deepEqual(getCrewHelpTasks(null), [])

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' })
globalThis.window = dom.window
globalThis.document = dom.window.document
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const importSource = (source) =>
  import(
    `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
  )
const localize = (source) =>
  source
    .replace(
      /from ["']react["']/g,
      `from '${pathToFileURL(require.resolve('react')).href}'`,
    )
    .replace(
      /["']\.\.\/components\/GalaxySocial\/frontierCrewRoutes["']/g,
      JSON.stringify(
        new URL(
          '../src/components/GalaxySocial/frontierCrewRoutes.js',
          import.meta.url,
        ).href,
      ),
    )
    .replace(
      /["']\.\/frontierCrewRoutes["']/g,
      JSON.stringify(
        new URL(
          '../src/components/GalaxySocial/frontierCrewRoutes.js',
          import.meta.url,
        ).href,
      ),
    )
const hookSource = localize(
  readFileSync(
    new URL('../src/hooks/useFrontierCrewTravel.js', import.meta.url),
    'utf8',
  ),
)
const { useFrontierCrewTravel } = await importSource(hookSource)
const root = createRoot(document.getElementById('root'))
let hook
const pending = [],
  arrived = [],
  errors = []
const request = (uid) =>
  new Promise((resolve, reject) => pending.push({ uid, resolve, reject }))
function Harness({ identityKey }) {
  hook = useFrontierCrewTravel({
    identityKey,
    request,
    onArrive: (value) => arrived.push(value),
    onError: (error) => errors.push(error.message),
  })
  return null
}
const render = (key) =>
  act(async () =>
    root.render(
      React.createElement(
        React.StrictMode,
        null,
        React.createElement(Harness, { identityKey: key }),
      ),
    ),
  )
await render('account-a')
await act(async () => {
  hook.start('friend', '친구')
  hook.start('private', '중복')
})
assert.equal(
  pending.length,
  1,
  'same-tick duplicate must not issue a second request',
)
assert.equal(hook.pending.uid, 'friend')
await act(async () => pending[0].resolve('friend'))
assert.deepEqual(arrived, ['friend'])
assert.equal(hook.pending, null)
await act(async () => hook.start('friend', '친구'))
await act(async () => hook.cancel())
await act(async () => pending[1].resolve('cancelled'))
assert.deepEqual(
  arrived,
  ['friend'],
  'late cancelled response must not replace world',
)
await act(async () => hook.start('friend', '친구'))
await act(async () => pending[2].reject(new Error('permission-denied')))
assert.deepEqual(errors, ['permission-denied'])
assert.equal(hook.pending, null)
await act(async () => hook.start('friend', '친구'))
await render('account-b')
assert.equal(hook.pending, null)
await act(async () => pending[3].resolve('old-account'))
assert.deepEqual(
  arrived,
  ['friend'],
  'account/session switch invalidates in-flight request',
)
await act(async () => {
  hook.start('next', '다음')
  hook.cancel()
  hook.start('new', '새 목적지')
})
await act(async () => pending[4].resolve('stale'))
assert.equal(hook.pending.uid, 'new', 'old finally must not clear a newer trip')
await act(async () => pending[5].resolve('new'))
assert.deepEqual(arrived, ['friend', 'new'])
await act(async () => hook.start('friend', '친구'))
await act(async () => root.unmount())
await act(async () => pending[6].resolve('unmounted'))
assert.deepEqual(arrived, ['friend', 'new'])

const atlasSource = localize(
  readFileSync(
    new URL(
      '../src/components/GalaxySocial/FrontierCrewAtlas.jsx',
      import.meta.url,
    ),
    'utf8',
  ).replace(/import ["']\.\/FrontierCrewAtlas\.css["'];?/, ''),
)
const compiled = await transform(atlasSource, {
  loader: 'jsx',
  jsx: 'transform',
})
const { default: Atlas, CrewVisitActivities } = await importSource(
  `import React from '${pathToFileURL(require.resolve('react')).href}';\n${compiled.code}`,
)
const uiRoot = createRoot(document.getElementById('root'))
const visits = [],
  inspected = [],
  blocked = [],
  reports = []
const click = (element) =>
  act(async () =>
    element.dispatchEvent(new window.MouseEvent('click', { bubbles: true })),
  )
await act(async () =>
  uiRoot.render(
    React.createElement(Atlas, {
      neighbors: routes,
      currentUid: 'me',
      onVisit: (uid) => visits.push(uid),
      onBlock: (route) => blocked.push(route.uid),
      onReport: (route) => reports.push(route.uid),
    }),
  ),
)
assert.equal(visits.length, 0, 'rendering or browsing atlas is local only')
await click(document.querySelectorAll('.crew-star')[1])
assert.equal(document.querySelector('.crew-depart').disabled, true)
await click(document.querySelector('.crew-depart'))
assert.equal(visits.length, 0)
await click(document.querySelectorAll('.crew-star')[2])
assert.equal(document.querySelector('.crew-depart').disabled, true)
await click(document.querySelectorAll('.crew-star')[0])
assert.equal(
  visits.length,
  0,
  'selecting an open destination must not auto-travel',
)
await click(document.querySelector('.crew-depart'))
assert.deepEqual(visits, ['friend'])
await click(document.querySelectorAll('.crew-safety button')[0])
await click(document.querySelectorAll('.crew-safety button')[1])
assert.deepEqual(blocked, ['friend'])
assert.deepEqual(reports, ['friend'])
await act(async () =>
  uiRoot.render(
    React.createElement(CrewVisitActivities, {
      planet: { layout },
      onInspect: (item) => inspected.push(item.instanceId),
      onReturn() {},
      onLogs() {},
    }),
  ),
)
await click(document.querySelector('.crew-activity-list button'))
assert.deepEqual(
  inspected,
  ['g'],
  'activity uses real facility instance instead of adding a reward endpoint',
)
await act(async () => uiRoot.unmount())
dom.window.close()
console.log(
  'PASS crew admission UX, gate bounds, facility tasks, real React/StrictMode travel lifecycle, atlas selection/confirmation/safety and activities (synthetic transport).',
)

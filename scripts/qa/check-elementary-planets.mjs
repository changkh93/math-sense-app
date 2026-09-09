// Run against: npm run dev -- --host 127.0.0.1 --port 5178
import assert from 'node:assert/strict'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright')
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
const origin = process.env.ELEMENTARY_QA_ORIGIN || 'http://127.0.0.1:5178'

try {
  const listPage = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  const listErrors = []
  listPage.on('pageerror', (error) => listErrors.push(error.message))
  await listPage.goto(`${origin}/scripts/qa/elementary-planets.html`)
  await listPage.waitForSelector('.elementary-world-card')
  assert.equal(await listPage.locator('canvas').count(), 0, '2D list must not create a WebGL canvas')
  assert.equal(await listPage.locator('.elementary-world-card').count(), 7)
  assert.equal(await listPage.locator('.elementary-station-grid button').count(), 4)
  assert.equal(await listPage.locator('.elementary-world-card').filter({ hasText: '참여 신청' }).count(), 1)
  assert.equal(await listPage.locator('.elementary-world-card').filter({ hasText: '이용 일시정지' }).count(), 1)
  await listPage.getByRole('button', { name: '3D 우주 탐사' }).click()
  assert.equal(await listPage.locator('#qa-action').textContent(), '3d')
  for (const width of [1000, 768, 390, 320]) {
    await listPage.setViewportSize({ width, height: 844 })
    assert.ok(await listPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `2D overflow at ${width}px`)
  }
  await listPage.setViewportSize({ width: 390, height: 844 })
  await listPage.screenshot({ path: '/tmp/elementary-revised-2d-mobile.png', fullPage: true })
  for (const state of ['loading', 'error', 'empty']) {
    await listPage.goto(`${origin}/scripts/qa/elementary-planets.html?${state}`)
    await listPage.waitForSelector('.elementary-empty')
    assert.equal(await listPage.locator('.elementary-station-grid button').count(), 4)
  }
  assert.deepEqual(listErrors, [])
  await listPage.close()

  const scenePage = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const sceneErrors = []
  const failedResponses = []
  scenePage.on('pageerror', (error) => sceneErrors.push(error.message))
  scenePage.on('response', (response) => { if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`) })
  await scenePage.goto(`${origin}/scripts/qa/space-scene.html`)
  await scenePage.waitForSelector('canvas')
  await scenePage.getByText('드래그로 둘러보기 · 휠로 확대/축소').waitFor()
  await scenePage.getByText('아디테라 (Additera)').waitFor()
  assert.equal(await scenePage.locator('canvas').count(), 1, '3D exploration must use one shared canvas')
  assert.equal(await scenePage.locator('.elementary-map').count(), 0, '3D exploration must not use the bounded card map')
  const canvas = scenePage.locator('canvas')
  await scenePage.waitForTimeout(450)
  await scenePage.screenshot({ path: '/tmp/elementary-revised-3d-overview.png', fullPage: true })
  const beforeRotation = await canvas.screenshot()
  await scenePage.waitForTimeout(650)
  assert.notDeepEqual(await canvas.screenshot(), beforeRotation, 'planet surfaces and star field must animate')

  const bounds = await canvas.boundingBox()
  await scenePage.mouse.move(bounds.x + bounds.width * 0.5, bounds.y + bounds.height * 0.5)
  await scenePage.mouse.wheel(0, -850)
  await scenePage.waitForTimeout(450)
  await scenePage.mouse.down()
  await scenePage.mouse.move(bounds.x + bounds.width * 0.66, bounds.y + bounds.height * 0.42, { steps: 8 })
  await scenePage.mouse.up()
  await scenePage.waitForTimeout(350)
  await scenePage.screenshot({ path: '/tmp/elementary-revised-3d-exploration.png', fullPage: true })
  assert.deepEqual(sceneErrors, [])
  assert.deepEqual(failedResponses, [])

  await canvas.evaluate((element) => element.dispatchEvent(new Event('webglcontextlost', { cancelable: true })))
  await scenePage.getByText('3D 렌더링을 지원하지 않는 기기입니다. 2D 모드를 사용해 주세요.').waitFor()
  await scenePage.close()

  console.log(JSON.stringify({
    result: 'PASS',
    checks: [
      '2D has no WebGL',
      '2D routes and access states',
      '320–1440px 2D layout',
      'one shared 3D canvas',
      'unbounded space scene restored',
      'animated spherical surfaces',
      'wheel zoom and drag orbit without errors',
      'WebGL loss fallback',
    ],
  }, null, 2))
} finally {
  await browser.close()
}

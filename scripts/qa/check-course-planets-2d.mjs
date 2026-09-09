import assert from 'node:assert/strict'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright')
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
const origin = process.env.COURSE_2D_QA_ORIGIN || 'http://127.0.0.1:5173'
const scenes = [
  { key: 'middle', cards: 6, stations: 4, heading: '중등수학 성단' },
  { key: 'python', cards: 4, stations: 6, heading: '파이썬 성단' },
  { key: 'classic', cards: 3, stations: 3, heading: '고전 읽기 우주' },
]

try {
  for (const scene of scenes) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
    const runtimeErrors = []
    const failedResponses = []
    page.on('pageerror', (error) => runtimeErrors.push(error.message))
    page.on('response', (response) => {
      if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`)
    })

    await page.goto(`${origin}/scripts/qa/course-planets-2d.html?cluster=${scene.key}`)
    await page.getByRole('heading', { name: new RegExp(scene.heading) }).waitFor()
    assert.equal(await page.locator('canvas').count(), 0, `${scene.key} 2D view must not create WebGL`)
    assert.equal(await page.locator('.course-world-card').count(), scene.cards)
    assert.equal(await page.locator('.course-station-grid button').count(), scene.stations)
    assert.equal(await page.locator('.course-world-card').filter({ hasText: '참여 신청' }).count(), 1)
    assert.equal(await page.locator('.course-world-card').filter({ hasText: '이용 일시정지' }).count(), 1)

    await page.getByRole('button', { name: '3D 우주 탐사' }).click()
    assert.equal(await page.locator('#qa-action').textContent(), '3d')
    for (const width of [1440, 1000, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 })
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${scene.key} overflow at ${width}px`)
    }
    await page.setViewportSize({ width: 390, height: 844 })
    await page.screenshot({ path: `/tmp/course-2d-${scene.key}-mobile.png`, fullPage: true })
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.screenshot({ path: `/tmp/course-2d-${scene.key}.png`, fullPage: true })

    assert.deepEqual(runtimeErrors, [], `${scene.key} runtime errors`)
    assert.deepEqual(failedResponses, [], `${scene.key} failed resources`)
    await page.close()
  }

  console.log(JSON.stringify({
    result: 'PASS',
    checks: [
      'middle 6 worlds and 4 stations',
      'Python 4 worlds and 6 stations',
      'classic 3 canonical worlds and 3 reading stations',
      'no WebGL in all 2D views',
      'access, completed, and recent states',
      '320–1440px without horizontal overflow',
      'no runtime or resource errors',
    ],
  }, null, 2))
} finally {
  await browser.close()
}

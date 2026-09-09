import assert from 'node:assert/strict'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright')
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
const origin = process.env.COURSE_PLANET_QA_ORIGIN || 'http://127.0.0.1:5173'
const scenes = [
  {
    key: 'elementary',
    screenshot: '/tmp/course-planets-elementary.png',
    labels: ['초등수학 월간평가'],
  },
  {
    key: 'middle',
    screenshot: '/tmp/course-planets-middle.png',
    labels: ['기본개념 전과정', '절대개념 - 수와 연산 & 문자와 식', '절대개념 - 함수 & 확률과 통계', '절대개념 - 기하', '단원평가&모의고사', '내신기출문제'],
  },
  {
    key: 'python',
    screenshot: '/tmp/course-planets-python.png',
    labels: ['처음 파이썬', '게임 프로젝트', '파이썬 심화', '파이썬 수학'],
  },
]
const fpsByScene = {}

try {
  for (const scene of scenes) {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
    const runtimeErrors = []
    const failedResponses = []
    page.on('pageerror', (error) => runtimeErrors.push(error.message))
    page.on('response', (response) => {
      if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`)
    })

    await page.goto(`${origin}/scripts/qa/space-scene.html?cluster=${scene.key}`)
    await page.waitForSelector('canvas')
    for (const label of scene.labels) await page.getByText(label, { exact: true }).waitFor()
    assert.equal(await page.locator('canvas').count(), 1, `${scene.key} must use one canvas`)

    const canvas = page.locator('canvas')
    await page.waitForTimeout(1000)
    const before = await canvas.screenshot()
    await page.waitForTimeout(500)
    assert.notDeepEqual(await canvas.screenshot(), before, `${scene.key} worlds must animate`)
    const measuredFps = await page.evaluate(() => new Promise((resolve) => {
      let frames = 0
      const startedAt = performance.now()
      const countFrame = (now) => {
        frames += 1
        if (now - startedAt >= 1000) resolve(frames * 1000 / (now - startedAt))
        else requestAnimationFrame(countFrame)
      }
      requestAnimationFrame(countFrame)
    }))
    assert.ok(measuredFps >= 30, `${scene.key} should remain interactive, measured ${measuredFps.toFixed(1)}fps`)
    fpsByScene[scene.key] = Number(measuredFps.toFixed(1))
    await page.screenshot({ path: scene.screenshot, fullPage: true })

    const bounds = await canvas.boundingBox()
    await page.mouse.move(bounds.x + bounds.width * 0.55, bounds.y + bounds.height * 0.55)
    await page.mouse.wheel(0, -500)
    await page.waitForTimeout(300)
    assert.deepEqual(runtimeErrors, [], `${scene.key} runtime errors`)
    assert.deepEqual(failedResponses, [], `${scene.key} failed resources`)
    await page.close()
  }

  console.log(JSON.stringify({
    result: 'PASS',
    fpsByScene,
    checks: [
      'elementary monthly evaluation identity rendered',
      'six middle-math identities rendered',
      'four Python identities rendered',
      'single canvas per scene',
      'at least 30fps in headless Chromium smoke profile',
      'rotation and zoom without runtime errors',
      'no failed resources',
    ],
  }, null, 2))
} finally {
  await browser.close()
}

import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const html = await readFile('dist/python-game-studio/index.html', 'utf8')
const config = JSON.parse(await readFile('firebase.json', 'utf8'))
const sitemap = await readFile('dist/sitemap.xml', 'utf8')
const getTag = pattern => html.match(pattern)?.[1]

assert.match(html, /<h1\b[^>]*>로그인 없이 쓰는 무료 파이썬 코드 스튜디오<\/h1>/)
assert.match(html, /설치 없이 브라우저에서 Python 파일과 노트북을 작성·실행하세요/)
assert.match(html, /<a href="\/python\/guides\/">파이썬 학습노트<\/a>/)
assert.match(html, /<a class="pgs-learn-link" href="\/python\/#courses">파이썬 배우기<\/a>/)
assert.equal(getTag(/<link rel="canonical" href="([^"]+)"/), 'https://msense.me/python-game-studio/')
assert.match(html, /<meta name="robots" content="index,follow,max-image-preview:large">/)
assert.match(html, /<meta property="og:title" content="무료 Python 코드 스튜디오/)
const schema = JSON.parse(getTag(/<script data-public-seo-schema type="application\/ld\+json">([^<]+)<\/script>/))
assert.equal(schema['@type'], 'WebApplication')
assert.equal(schema.url, 'https://msense.me/python-game-studio/')
assert.equal(schema.offers.price, '0')
assert.ok(config.hosting.rewrites.some(rule => rule.source === '/python-game-studio' && rule.destination === '/python-game-studio/index.html'))
assert.match(sitemap, /<loc>https:\/\/msense.me\/python-game-studio\/<\/loc>/)
assert.ok(!html.includes('<div id="root"></div>'))
console.log('PASS public studio static HTML, internal links, canonical, schema, sitemap and Hosting route')

import { openBrowser } from '@remotion/renderer';
import { readFileSync, writeFileSync } from 'node:fs';

async function testComposite() {
  const browser = await openBrowser('chrome');
  const page = await browser.newPage({ width: 409, height: 512 });

  const bgBase64 = readFileSync('/Users/selah/.gemini/antigravity/brain/37898aac-3782-405c-b14f-d69d372334de/scratch/first_contact_test.png').toString('base64');
  const bgDataUrl = `data:image/png;base64,${bgBase64}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<link rel="preconnect" href="https://cdn.jsdelivr.net">
<link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 409px;
    height: 512px;
    overflow: hidden;
    position: relative;
    font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif;
  }
  .bg {
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
    object-fit: cover;
  }
  .overlay {
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    padding: 34px 24px 30px;
    text-align: center;
    z-index: 10;
  }
  .category-tag {
    font-size: 11.5px;
    font-weight: 700;
    letter-spacing: 0.12em;
    color: #E8C56A;
    text-shadow: 0 0 10px rgba(232, 197, 106, 0.6), 0 2px 4px rgba(0,0,0,0.9);
  }
  .content-bottom {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .title {
    font-size: 23px;
    font-weight: 900;
    letter-spacing: -0.02em;
    color: #F8E29B;
    text-shadow: 
      0 0 16px rgba(232, 197, 106, 0.7),
      0 2px 6px rgba(0, 0, 0, 0.95),
      0 0 2px #000, 0 0 2px #000;
    margin-bottom: 7px;
  }
  .desc {
    font-size: 11.5px;
    font-weight: 500;
    color: rgba(235, 243, 255, 0.88);
    line-height: 1.38;
    max-width: 280px;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.95);
    margin-bottom: 22px;
  }
  .status-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 7px 22px;
    font-size: 13.5px;
    font-weight: 800;
    color: #FFFFFF;
    text-shadow: 0 0 8px rgba(0, 229, 200, 0.8), 0 1px 3px rgba(0,0,0,0.9);
    letter-spacing: 0.05em;
  }
</style>
</head>
<body>
  <img class="bg" src="${bgDataUrl}" />
  <div class="overlay">
    <div class="category-tag">탐사 배지</div>
    <div class="content-bottom">
      <div class="title">첫 번째 교신</div>
      <div class="desc">두 행성을 잇는 첫 번째 전파 교신에 성공했습니다.</div>
      <div class="status-btn">✓ 획득 완료</div>
    </div>
  </div>
</body>
</html>
  `;

  await page.setContent(html, { waitUntil: 'networkidle0' });
  const buffer = await page.screenshot({ type: 'png' });
  writeFileSync('/Users/selah/.gemini/antigravity/brain/37898aac-3782-405c-b14f-d69d372334de/scratch/first_contact_composited.png', buffer);
  await browser.close({ timeout: 5000 });
  console.log('Composited image saved successfully!');
}

testComposite().catch(console.error);

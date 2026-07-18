import assert from 'node:assert/strict'
import { getEmbeddablePdfUrl, normalizePdfUrl } from '../src/utils/pdfUrlUtils.js'

assert.equal(
  normalizePdfUrl('/pdfs/middle_math/geometry_1/08_모든 직각은 서로 같은가?.pdf'),
  '/pdfs/middle_math/geometry_1/08_%EB%AA%A8%EB%93%A0%20%EC%A7%81%EA%B0%81%EC%9D%80%20%EC%84%9C%EB%A1%9C%20%EA%B0%99%EC%9D%80%EA%B0%80%3F.pdf'
)

assert.equal(
  normalizePdfUrl('/pdfs/python/09_for%20%EB%B0%98%EB%B3%B5%EB%AC%B8.pdf'),
  '/pdfs/python/09_for%20%EB%B0%98%EB%B3%B5%EB%AC%B8.pdf'
)

assert.equal(
  getEmbeddablePdfUrl('https://drive.google.com/file/d/example-id/view?usp=sharing'),
  'https://drive.google.com/file/d/example-id/preview'
)

console.log('PDF URL normalization tests passed.')

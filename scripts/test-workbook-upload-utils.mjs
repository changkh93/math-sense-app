import assert from 'node:assert/strict';
import {
  isSupportedWorkbookImage,
  sortWorkbookImageFiles,
} from '../src/utils/workbookUploadUtils.js';

const files = [
  { name: 'Slide10.jpeg', type: 'image/jpeg' },
  { name: 'Slide2.jpeg', type: 'image/jpeg' },
  { name: 'Slide1.jpeg', type: 'image/jpeg' },
  { name: 'Slide11.jpeg', type: 'image/jpeg' },
  { name: 'Slide3.jpeg', type: 'image/jpeg' },
];

assert.deepEqual(
  sortWorkbookImageFiles(files).map(file => file.name),
  ['Slide1.jpeg', 'Slide2.jpeg', 'Slide3.jpeg', 'Slide10.jpeg', 'Slide11.jpeg'],
);
assert.equal(isSupportedWorkbookImage({ name: 'page.JPG', type: '' }), true);
assert.equal(isSupportedWorkbookImage({ name: 'page.webp', type: 'application/octet-stream' }), true);
assert.equal(isSupportedWorkbookImage({ name: 'page.pdf', type: 'application/pdf' }), false);

console.log('Workbook upload utility tests passed.');

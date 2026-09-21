import { access, readFile } from 'node:fs/promises';

const catalog = JSON.parse(await readFile('content/math-guides/catalog.json', 'utf8'));
const published = catalog.filter(article => article.status === 'published');
const fractionSeries = published.filter(article => article.source?.title?.startsWith('수학감각 분수'));
const multiplicationSeries = published.filter(article => article.source?.title === '수학감각 곱셈');
const divisionSeries = published.filter(article => article.source?.title === '수학감각 나눗셈');
const decimalSeries = published.filter(article => article.source?.title === '수학감각 소수');
const ratioSeries = published.filter(article => article.source?.title?.startsWith('수학감각 비와 비례식'));
const slugs = new Set();
const titles = new Set();

if (fractionSeries.length < 50) throw new Error(`Expected at least 50 textbook-based fraction notes, found ${fractionSeries.length}`);
if (multiplicationSeries.length < 50) throw new Error(`Expected at least 50 textbook-based multiplication notes, found ${multiplicationSeries.length}`);
if (divisionSeries.length < 50) throw new Error(`Expected at least 50 textbook-based division notes, found ${divisionSeries.length}`);
if (decimalSeries.length < 50) throw new Error(`Expected at least 50 textbook-based decimal notes, found ${decimalSeries.length}`);
if (ratioSeries.length < 100) throw new Error(`Expected at least 100 textbook-based ratio notes, found ${ratioSeries.length}`);

for (const article of published) {
  if (slugs.has(article.slug)) throw new Error(`Duplicate slug: ${article.slug}`);
  if (titles.has(article.title)) throw new Error(`Duplicate title: ${article.title}`);
  slugs.add(article.slug);
  titles.add(article.title);
  if (!article.description || article.description.length > 160) throw new Error(`Invalid description length: ${article.slug}`);
  if (!Array.isArray(article.related) || article.related.length < 2) throw new Error(`Missing related articles: ${article.slug}`);
  if (!Array.isArray(article.faq) || article.faq.length < 2) throw new Error(`Missing FAQ: ${article.slug}`);
  const markdown = await readFile(`content/math-guides/${article.slug}.md`, 'utf8');
  if (markdown.length < 650) throw new Error(`Article too short: ${article.slug}`);
}

for (const article of fractionSeries) {
  if (!Number.isInteger(article.source.page) || article.source.page < 1) throw new Error(`Invalid source page: ${article.slug}`);
  if (!article.source.alt?.includes(`${article.source.page}쪽`)) throw new Error(`Source alt does not name page: ${article.slug}`);
  await access(`public${article.source.image}`);
  const markdown = await readFile(`content/math-guides/${article.slug}.md`, 'utf8');
  for (const heading of ['교재 장면에서 먼저 볼 것', '예제로 확실히 이해하기', '자주 하는 오해', '집에서 5분 활동', '이해를 확인하는 질문']) {
    if (!markdown.includes(`## ${heading}`)) throw new Error(`Missing section "${heading}": ${article.slug}`);
  }
}

for (const article of multiplicationSeries) {
  if (!Number.isInteger(article.source.page) || article.source.page < 1) throw new Error(`Invalid multiplication source page: ${article.slug}`);
  if (!article.source.alt?.includes(`${article.source.page}쪽`)) throw new Error(`Multiplication source alt does not name page: ${article.slug}`);
  await access(`public${article.source.image}`);
  const markdown = await readFile(`content/math-guides/${article.slug}.md`, 'utf8');
  for (const heading of ['교재 장면에서 먼저 볼 것', '예제로 확실히 이해하기', '왜 이렇게 되는지', '자주 하는 오해', '집에서 5분 활동', '이해를 확인하는 질문']) {
    if (!markdown.includes(`## ${heading}`)) throw new Error(`Missing multiplication section "${heading}": ${article.slug}`);
  }
}

for (const article of divisionSeries) {
  if (!Number.isInteger(article.source.page) || article.source.page < 1) throw new Error(`Invalid division source page: ${article.slug}`);
  if (!article.source.alt?.includes(`${article.source.page}쪽`)) throw new Error(`Division source alt does not name page: ${article.slug}`);
  await access(`public${article.source.image}`);
  const markdown = await readFile(`content/math-guides/${article.slug}.md`, 'utf8');
  for (const heading of ['교재 장면에서 먼저 볼 것', '예제로 확실히 이해하기', '왜 이렇게 되는지', '자주 하는 오해', '집에서 5분 활동', '이해를 확인하는 질문']) {
    if (!markdown.includes(`## ${heading}`)) throw new Error(`Missing division section "${heading}": ${article.slug}`);
  }
}

for (const article of decimalSeries) {
  if (!Number.isInteger(article.source.page) || article.source.page < 1) throw new Error(`Invalid decimal source page: ${article.slug}`);
  if (!article.source.alt?.includes(`${article.source.page}쪽`)) throw new Error(`Decimal source alt does not name page: ${article.slug}`);
  await access(`public${article.source.image}`);
  const markdown = await readFile(`content/math-guides/${article.slug}.md`, 'utf8');
  for (const heading of ['교재 장면에서 먼저 볼 것', '예제로 확실히 이해하기', '왜 이렇게 되는지', '자주 하는 오해', '집에서 5분 활동', '이해를 확인하는 질문']) {
    if (!markdown.includes(`## ${heading}`)) throw new Error(`Missing decimal section "${heading}": ${article.slug}`);
  }
}

for (const article of ratioSeries) {
  if (!Number.isInteger(article.source.page) || article.source.page < 1) throw new Error(`Invalid ratio source page: ${article.slug}`);
  if (!article.source.alt?.includes(`${article.source.page}쪽`)) throw new Error(`Ratio source alt does not name page: ${article.slug}`);
  await access(`public${article.source.image}`);
  const markdown = await readFile(`content/math-guides/${article.slug}.md`, 'utf8');
  for (const heading of ['교재 장면에서 먼저 볼 것', '예제로 확실히 이해하기', '왜 이렇게 되는지', '자주 하는 오해', '집에서 5분 활동', '이해를 확인하는 질문']) {
    if (!markdown.includes(`## ${heading}`)) throw new Error(`Missing ratio section "${heading}": ${article.slug}`);
  }
}

for (const article of published) {
  for (const related of article.related) {
    if (!slugs.has(related)) throw new Error(`Broken related link ${article.slug} -> ${related}`);
  }
}

console.log(`Validated ${published.length} math guides, including ${fractionSeries.length} fraction, ${multiplicationSeries.length} multiplication, ${divisionSeries.length} division, ${decimalSeries.length} decimal, and ${ratioSeries.length} ratio textbook notes.`);

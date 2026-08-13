import { readFileSync } from 'fs';
import { auditQuizOptionLengths } from '../src/utils/quizOptionLengthAudit.js';

const data = JSON.parse(readFileSync('./scratch/neverland-missing-quizzes.json', 'utf8'));
const failures = [];

if (data.books?.length !== 14) failures.push(`expected 14 books, got ${data.books?.length}`);

for (const book of data.books || []) {
  if (book.quizzes?.length !== 15) failures.push(`${book.title}: expected 15 quizzes`);
  const indexCounts = [0, 0, 0, 0, 0];
  const bookQuestions = new Set();
  for (const [index, quiz] of (book.quizzes || []).entries()) {
    const label = `${book.title} q${index + 1}`;
    if (!quiz.question || bookQuestions.has(quiz.question)) failures.push(`${label}: missing or duplicate question`);
    bookQuestions.add(quiz.question);
    if (!Array.isArray(quiz.options) || quiz.options.length !== 5) {
      failures.push(`${label}: expected 5 options`);
      continue;
    }
    if (new Set(quiz.options).size !== 5) failures.push(`${label}: duplicate options`);
    const answerIndex = quiz.options.indexOf(quiz.answer);
    if (answerIndex < 0) failures.push(`${label}: answer missing from options`);
    else indexCounts[answerIndex] += 1;
    if (Array.from(String(quiz.answer).replace(/\s/g, '')).length > 16) failures.push(`${label}: answer too long`);
    if (quiz.options.some((option) => Array.from(String(option).replace(/\s/g, '')).length > 20)) {
      failures.push(`${label}: option too long`);
    }
    const options = quiz.options.map((text, optionIndex) => ({ text, isCorrect: optionIndex === answerIndex }));
    if (auditQuizOptionLengths(options).suspicious) failures.push(`${label}: suspicious answer-length cue`);
    if (!quiz.hint || Array.from(quiz.hint).length > 70) failures.push(`${label}: invalid hint`);
  }
  if (indexCounts.some((count) => count !== 3)) failures.push(`${book.title}: unbalanced answer positions ${indexCounts}`);
}

console.log(JSON.stringify({
  books: data.books?.length || 0,
  quizzes: data.books?.reduce((sum, book) => sum + (book.quizzes?.length || 0), 0) || 0,
  failures,
}, null, 2));

if (failures.length) process.exitCode = 1;

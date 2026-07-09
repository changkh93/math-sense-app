import React, { useEffect, useMemo, useRef, useState } from 'react';
import { doc, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore';
import { Check, ChevronLeft, Eye, Lightbulb, LocateFixed, RotateCcw, Save } from 'lucide-react';
import { EditorSelection, EditorState, RangeSetBuilder } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap, indentLess, indentMore } from '@codemirror/commands';
import { python } from '@codemirror/lang-python';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { Decoration, EditorView, GutterMarker, ViewPlugin, gutter, keymap } from '@codemirror/view';
import { db } from '../../firebase';
import { useAuth } from '../../hooks/useAuth';
import { buildStreakWriteAudit, calculateStreakUpdate, getTodayKST } from '../../utils/streakUtils';
import { calculateGrowthUpdates } from '../../utils/rankingUtils';
import { recordCrystalTransaction } from '../../utils/crystalLedger';
import { applyCrystalRewardMultiplier } from '../../utils/holidayUtils';
import soundManager from '../../utils/SoundManager';

const ANSWER_REVEAL_SECONDS = 30;
const STUDENT_INDENT = '  ';
const CODE_PANEL_MIN_HEIGHT = 300;
const CODE_PANEL_MAX_HEIGHT = 720;
const CODE_PANEL_LINE_HEIGHT_PX = 23;
const CODE_PANEL_VERTICAL_PADDING_PX = 32;
const STRING_STRUCTURE_TOKEN = '__STRING__';

// 보상: 라인 수 비례 + 반복 연습 감쇠
// 기본 보상 = 코드 줄 수 × 1.5 (반올림, 최소 2)
// 같은 세트를 반복 통과할 때마다 보상이 2/3씩 감소 (사용자 예시 15→10→7)
// 최대 MAX_ATTEMPTS 회까지 보상 지급, 그 이후는 연습만 가능
const LINE_REWARD_RATE = 1.5;
const MIN_EXERCISE_REWARD = 2;
const MAX_ATTEMPTS = 3;
const DECAY_FACTOR = 2 / 3;

function normalizeNewlines(text = '') {
  return String(text).replace(/\r\n/g, '\n');
}

function visibleWhitespace(text = '') {
  return String(text)
    .replace(/ /g, '·')
    .replace(/\t/g, '→ ')
    .replace(/\n/g, '↵\n');
}

function trimTrailingWhitespace(line = '') {
  return line.replace(/\s+$/g, '');
}

function isCommentOnlyLine(line = '') {
  return String(line || '').trimStart().startsWith('#');
}

function getTraceScoredLineEntries(code = '') {
  return normalizeNewlines(code)
    .split('\n')
    .map((line, originalIndex) => ({ line, originalIndex }))
    .filter(entry => !isCommentOnlyLine(entry.line));
}

function getTraceScoredCode(code = '') {
  return getTraceScoredLineEntries(code).map(entry => entry.line).join('\n');
}

function getLeadingWhitespace(line = '') {
  return String(line || '').match(/^\s*/)?.[0] || '';
}

function getIndentVisualWidth(indent = '') {
  return Array.from(indent).reduce((sum, char) => sum + (char === '\t' ? 2 : 1), 0);
}

function isAllowedIndent(indent = '') {
  if (!indent) return true;
  const chars = Array.from(indent);
  if (chars.every(char => char === '\t')) return true;
  if (chars.every(char => char === ' ')) return chars.length % 2 === 0;
  return getIndentVisualWidth(indent) % 2 === 0;
}

function buildIndentRankMap(lines = []) {
  const widths = new Set([0]);
  lines.forEach((line) => {
    const indent = getLeadingWhitespace(line);
    if (isAllowedIndent(indent)) widths.add(getIndentVisualWidth(indent));
  });
  return new Map([...widths].sort((a, b) => a - b).map((width, index) => [width, index]));
}

// 정답 코드의 들여쓰기 단위를 감지해 학생 입력란의 자동 인덴트를 정답과 맞춘다.
// 단위 = 들여쓰기가 쓰인 줄들 중 가장 작은 non-zero 너비(= 1단계 깊이).
// 4칸/8칸이 섞인 코드에서 빈도로 고르면 8칸이 잘못 잡히므로 최솟값을 쓴다.
// 탭이 하나라도 있고 스페이스보다 많으면 탭, 아니면 스페이스. 감지 못하면 2칸 폴백.
function detectIndentUnit(answerCode = '') {
  const lines = normalizeNewlines(answerCode).split('\n');
  let tabLines = 0;
  let spaceLines = 0;
  let minSpaceWidth = Infinity;

  lines.forEach((line) => {
    const indent = getLeadingWhitespace(line);
    if (!indent) return;
    if (/^\t+$/.test(indent)) {
      tabLines += 1;
      return;
    }
    const spaces = indent.match(/^ +/)?.[0] || '';
    if (spaces) {
      spaceLines += 1;
      minSpaceWidth = Math.min(minSpaceWidth, spaces.length);
    }
  });

  if (tabLines > 0 && tabLines >= spaceLines) return '\t';
  // 1단계 단위 = 가장 얕은 들여쓰기 너비. 2의 배수로 정규화(최소 2).
  if (minSpaceWidth !== Infinity) {
    const unit = Math.max(2, minSpaceWidth % 2 === 0 ? minSpaceWidth : minSpaceWidth);
    return ' '.repeat(unit);
  }
  return STUDENT_INDENT;
}

function normalizeIndentForCompare(line = '', indentRanks = null) {
  const indent = getLeadingWhitespace(line);
  const width = getIndentVisualWidth(indent);
  if (!indentRanks) return indent;
  if (!isAllowedIndent(indent)) return `__bad_indent_${width}__`;
  return `__indent_${indentRanks.get(width) ?? width}__`;
}

function normalizePythonLineForCompare(line = '', indentRanks = null) {
  const raw = trimTrailingWhitespace(String(line || ''));
  const indent = getLeadingWhitespace(raw);
  const body = raw.slice(indent.length);
  let result = normalizeIndentForCompare(raw, indentRanks);
  let quote = '';
  let escaped = false;

  for (const char of body) {
    if (quote) {
      result += char;
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        quote = '';
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      result += char;
      continue;
    }

    if (!/\s/.test(char)) {
      result += char;
    }
  }

  return result;
}

function hasOnlyQuotedWhitespaceDifference(answerLine = '', studentLine = '') {
  const normalizedAnswer = normalizePythonLineForCompare(answerLine);
  const normalizedStudent = normalizePythonLineForCompare(studentLine);
  if (normalizedAnswer === normalizedStudent) return false;
  if (!/["']/.test(normalizedAnswer) && !/["']/.test(normalizedStudent)) return false;
  return normalizedAnswer.replace(/\s/g, '') === normalizedStudent.replace(/\s/g, '');
}

function countChar(text, char) {
  return Array.from(text || '').filter(c => c === char).length;
}

function findStringLiteralEnd(code = '', startIndex = 0) {
  const quote = code[startIndex];
  if (quote !== '"' && quote !== "'") return -1;
  const triple = code.slice(startIndex, startIndex + 3) === quote.repeat(3);
  let index = startIndex + (triple ? 3 : 1);
  let escaped = false;

  while (index < code.length) {
    const char = code[index];
    if (escaped) {
      escaped = false;
      index += 1;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      index += 1;
      continue;
    }
    if (triple && code.slice(index, index + 3) === quote.repeat(3)) {
      return index + 3;
    }
    if (!triple && char === quote) {
      return index + 1;
    }
    index += 1;
  }

  return -1;
}

function mapStringLiterals(code = '', mapper = () => STRING_STRUCTURE_TOKEN) {
  const source = normalizeNewlines(code);
  let output = '';
  let index = 0;
  while (index < source.length) {
    const char = source[index];
    if (char !== '"' && char !== "'") {
      output += char;
      index += 1;
      continue;
    }

    const end = findStringLiteralEnd(source, index);
    if (end < 0) {
      output += source.slice(index);
      break;
    }

    const literal = source.slice(index, end);
    output += mapper(literal, index, end);
    index = end;
  }
  return output;
}

function normalizePythonCodeForStructureCompare(code = '') {
  const withoutStringContents = mapStringLiterals(code, () => STRING_STRUCTURE_TOKEN);
  const lines = withoutStringContents.split('\n');
  const indentRanks = buildIndentRankMap(lines);
  return lines.map(line => normalizePythonLineForCompare(line, indentRanks)).join('\n');
}

function normalizePythonLineForStructureCompare(line = '', indentRanks = null) {
  return normalizePythonLineForCompare(mapStringLiterals(line, () => STRING_STRUCTURE_TOKEN), indentRanks);
}

function getStringLiteralLabel(literal = '') {
  const normalized = normalizeNewlines(literal).replace(/\n/g, '\\n');
  const inner = normalized
    .replace(/^(['"]{3}|['"])/, '')
    .replace(/(['"]{3}|['"])$/, '');
  const label = inner || normalized;
  return label.length > 28 ? `${label.slice(0, 25)}...` : label;
}

function extractStringLiteralSuggestions(code = '') {
  const source = normalizeNewlines(code);
  const seen = new Set();
  const suggestions = [];
  let index = 0;

  while (index < source.length) {
    const char = source[index];
    if (char !== '"' && char !== "'") {
      index += 1;
      continue;
    }

    const end = findStringLiteralEnd(source, index);
    if (end < 0) break;
    const literal = source.slice(index, end);
    if (!seen.has(literal)) {
      const lineStart = source.lastIndexOf('\n', index - 1) + 1;
      const linePrefix = source.slice(lineStart, index);
      seen.add(literal);
      suggestions.push({
        id: `${index}-${end}`,
        literal,
        label: getStringLiteralLabel(literal),
        lineNumber: source.slice(0, index).split('\n').length,
        linePrefix,
        prefixKey: linePrefix.replace(/\s/g, ''),
      });
    }
    index = end;
  }

  return suggestions;
}

function extractCommentLineSuggestions(code = '') {
  const seen = new Set();
  return normalizeNewlines(code)
    .split('\n')
    .map((line, index) => ({
      raw: line,
      text: line.trimStart(),
      lineNumber: index + 1,
    }))
    .filter(item => isCommentOnlyLine(item.raw))
    .filter((item) => {
      const key = item.text.replace(/\s+/g, ' ').trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(item => ({
      id: `comment-${item.lineNumber}-${item.text}`,
      literal: item.text,
      label: item.text.length > 34 ? `${item.text.slice(0, 31)}...` : item.text,
      lineNumber: item.lineNumber,
    }));
}

function normalizeStringSuggestionPrefix(prefix = '') {
  return String(prefix || '').replace(/['"]$/g, '').replace(/\s/g, '');
}

function getStringSuggestionAtCursor(suggestions = [], studentCode = '', cursor = 0) {
  if (!suggestions.length) return null;
  const safeCursor = Math.max(0, Math.min(cursor, studentCode.length));
  const lineStart = studentCode.lastIndexOf('\n', safeCursor - 1) + 1;
  const linePrefix = studentCode.slice(lineStart, safeCursor);
  const prefixKey = normalizeStringSuggestionPrefix(linePrefix);
  if (!prefixKey) return null;

  return suggestions.find((suggestion) => (
    prefixKey === normalizeStringSuggestionPrefix(suggestion.linePrefix) &&
    !studentCode.slice(lineStart).includes(suggestion.literal)
  )) || null;
}

function evaluateCode(answerCode, studentCode) {
  const answerEntries = getTraceScoredLineEntries(answerCode);
  const studentEntries = getTraceScoredLineEntries(studentCode);
  const answerLines = answerEntries.map(entry => entry.line);
  const studentLines = studentEntries.map(entry => entry.line);
  const answer = answerLines.join('\n');
  const student = studentLines.join('\n');
  const answerIndentRanks = buildIndentRankMap(answerLines);
  const studentIndentRanks = buildIndentRankMap(studentLines);
  const targetAnswer = normalizePythonCodeForStructureCompare(answer);
  const targetStudent = normalizePythonCodeForStructureCompare(student);
  const targetAnswerLines = targetAnswer.split('\n');
  const targetStudentLines = targetStudent.split('\n');
  const targetIndexes = targetAnswerLines.map((_, index) => index);
  const totalChars = Math.max(targetAnswer.length, targetStudent.length, 1);

  let sameChars = 0;
  for (let i = 0; i < Math.min(targetAnswer.length, targetStudent.length); i += 1) {
    if (targetAnswer[i] === targetStudent[i]) sameChars += 1;
  }

  let correctLines = 0;
  targetIndexes.forEach((index) => {
    if ((targetAnswerLines[index] || '') === (targetStudentLines[index] || '')) {
      correctLines += 1;
    }
  });

  const issues = [];
  targetIndexes.forEach((index) => {
    const answerLine = answerLines[index] || '';
    const studentLine = studentLines[index] || '';
    if (!studentLine && answerLine) {
      const hasString = mapStringLiterals(answerLine) !== answerLine;
      issues.push(hasString
        ? `${index + 1}번째 줄의 코드 구조를 입력해 보세요. 긴 문자열은 아래 도우미나 Tab으로 채울 수 있습니다.`
        : `${index + 1}번째 줄이 비어 있습니다.`);
      return;
    }
    if (answerLine.trim().endsWith(':') && !studentLine.trim().endsWith(':')) {
      issues.push(`${index + 1}번째 줄 끝의 콜론(:)을 확인하세요.`);
    }
    // 들여쓰기 안내는 깊이 단계(rank)가 실제로 어긋났을 때만.
    // 2칸/4칸/탭은 같은 깊이 단계로 정규화되므로 단계만 같으면 안내하지 않는다.
    const answerIndentRank = normalizeIndentForCompare(answerLine, answerIndentRanks);
    const studentIndentRank = normalizeIndentForCompare(studentLine, studentIndentRanks);
    const sameCodeDifferentDepth = normalizePythonLineForCompare(answerLine, answerIndentRanks) !== normalizePythonLineForCompare(studentLine, studentIndentRanks)
      && normalizePythonLineForCompare(answerLine).replace(/^\s*/, '') === normalizePythonLineForCompare(studentLine).replace(/^\s*/, '')
      && answerIndentRank !== studentIndentRank;
    if (sameCodeDifferentDepth) {
      issues.push(`${index + 1}번째 줄의 들여쓰기 단계(들어가는 깊이)를 확인하세요. 탭, 스페이스 2칸, 스페이스 4칸은 같은 단계로 인정됩니다.`);
    }
    if (hasOnlyQuotedWhitespaceDifference(answerLine, studentLine)) {
      issues.push(`${index + 1}번째 줄의 문자열 내용은 자동 채우기 대상입니다. 따옴표 위치와 코드 구조를 먼저 확인하세요.`);
    }
    if (countChar(studentLine, '(') !== countChar(studentLine, ')')) {
      issues.push(`${index + 1}번째 줄의 괄호 짝을 확인하세요.`);
    }
    if (countChar(studentLine, '"') % 2 !== 0 || countChar(studentLine, "'") % 2 !== 0) {
      issues.push(`${index + 1}번째 줄의 따옴표 짝을 확인하세요.`);
    }
  });

  return {
    perfect: correctLines === targetIndexes.length && targetIndexes.length > 0,
    accuracy: Math.max(0, Math.round((sameChars / totalChars) * 100)),
    correctLines,
    totalLines: targetIndexes.length,
    answerLines,
    studentLines,
    issues: issues.length ? issues.slice(0, 5) : ['특별한 문법 오류는 감지되지 않았습니다. 다른 글자나 공백을 정답 코드와 비교해 보세요.']
  };
}

const FULL_WIDTH_PUNCTUATION_MAP = {
  '（': '(',
  '）': ')',
  '，': ',',
  '：': ':',
  '；': ';',
  '［': '[',
  '］': ']',
  '｛': '{',
  '｝': '}',
  '“': '"',
  '”': '"',
  '‘': "'",
  '’': "'",
};

const ISSUE_META = {
  case: { label: '대소문자', color: '#facc15' },
  whitespace: { label: '공백/줄바꿈', color: '#38bdf8' },
  indent: { label: '들여쓰기', color: '#a78bfa' },
  punctuation: { label: '문장부호', color: '#fb923c' },
  missing: { label: '누락', color: '#f87171' },
  extra: { label: '추가 입력', color: '#fb923c' },
  string: { label: '문자열', color: '#34d399' },
  typo: { label: '오탈자', color: '#f87171' },
  formatting: { label: '표기 차이', color: '#38bdf8' },
};

function normalizeCommonPunctuation(text = '') {
  return Array.from(String(text || '')).map(char => FULL_WIDTH_PUNCTUATION_MAP[char] || char).join('');
}

function stripAllWhitespace(text = '') {
  return String(text || '').replace(/\s/g, '');
}

function shortenCode(text = '') {
  const trimmed = String(text || '').trim();
  if (!trimmed) return '(빈 줄)';
  return trimmed.length > 46 ? `${trimmed.slice(0, 43)}...` : trimmed;
}

function classifyLineIssue(answerLine = '', studentLine = '', answerIndentRanks = null, studentIndentRanks = null) {
  if (answerLine === studentLine) return null;

  const answerTrim = answerLine.trim();
  const answerNormalized = normalizePythonLineForCompare(answerLine, answerIndentRanks);
  const studentNormalized = normalizePythonLineForCompare(studentLine, studentIndentRanks);
  const acceptedByScoring = answerNormalized === studentNormalized;

  // 채점 통과(깊이 단계·토큰 기준)하는 줄은 diff에도 표시하지 않는다.
  // "통과하는데 틀렸다고 표시" 모순(2칸/4칸, 연산자 양옆 공백 등)을 제거.
  if (acceptedByScoring) return null;

  // 들여쓰기 단계(rank)가 다른 경우만 'indent'로 분류.
  // 2칸과 4칸은 같은 깊이 단계로 정규화되므로 인정되고, 단계 자체가 어긋나면 표시.
  // rank는 원본 줄(들여쓰기 포함)에서 뽑아야 한다. trim하면 들여쓰기가 사라져 둘 다 0단계가 됨.
  const answerIndentRank = normalizeIndentForCompare(answerLine, answerIndentRanks);
  const studentIndentRank = normalizeIndentForCompare(studentLine, studentIndentRanks);
  const answerIndentless = normalizePythonLineForCompare(answerLine).replace(/^\s*/, '');
  const studentIndentless = normalizePythonLineForCompare(studentLine).replace(/^\s*/, '');
  if (answerIndentless === studentIndentless && answerIndentRank !== studentIndentRank) {
    return 'indent';
  }
  if (answerLine.toLowerCase() === studentLine.toLowerCase()) {
    return 'case';
  }
  if (stripAllWhitespace(answerLine) === stripAllWhitespace(studentLine)) {
    return 'whitespace';
  }
  if (normalizeCommonPunctuation(studentLine) === answerLine || normalizeCommonPunctuation(studentLine.trim()) === answerTrim) {
    return 'punctuation';
  }
  if (
    mapStringLiterals(answerLine) !== answerLine &&
    normalizePythonLineForStructureCompare(answerLine, answerIndentRanks) === normalizePythonLineForStructureCompare(studentLine, studentIndentRanks)
  ) {
    return 'string';
  }
  return 'typo';
}

function buildCaseTokens(answerLine = '', studentLine = '') {
  const tokens = [];
  const maxLength = Math.max(answerLine.length, studentLine.length);
  for (let index = 0; index < maxLength; index += 1) {
    const answerChar = answerLine[index] || '';
    const studentChar = studentLine[index] || '';
    if (answerChar && !studentChar) {
      tokens.push({ type: 'missing', value: answerChar });
    } else if (!answerChar && studentChar) {
      tokens.push({ type: 'extra', value: studentChar });
    } else if (answerChar === studentChar) {
      tokens.push({ type: 'equal', value: studentChar });
    } else if (answerChar.toLowerCase() === studentChar.toLowerCase()) {
      tokens.push({ type: 'case', value: studentChar, expected: answerChar });
    } else {
      tokens.push({ type: 'wrong', value: studentChar, expected: answerChar });
    }
  }
  return mergeAdjacentTokens(tokens);
}

function mergeAdjacentTokens(tokens = []) {
  return tokens.reduce((merged, token) => {
    const prev = merged[merged.length - 1];
    if (prev && prev.type === token.type) {
      prev.value = `${prev.value || ''}${token.value || ''}`;
      prev.expected = `${prev.expected || ''}${token.expected || ''}`;
      return merged;
    }
    merged.push({ ...token });
    return merged;
  }, []);
}

function buildFallbackLineDiff(answerLine = '', studentLine = '') {
  let prefixLength = 0;
  while (
    prefixLength < answerLine.length &&
    prefixLength < studentLine.length &&
    answerLine[prefixLength] === studentLine[prefixLength]
  ) {
    prefixLength += 1;
  }

  let suffixLength = 0;
  while (
    suffixLength < answerLine.length - prefixLength &&
    suffixLength < studentLine.length - prefixLength &&
    answerLine[answerLine.length - 1 - suffixLength] === studentLine[studentLine.length - 1 - suffixLength]
  ) {
    suffixLength += 1;
  }

  const tokens = [];
  if (prefixLength > 0) tokens.push({ type: 'equal', value: studentLine.slice(0, prefixLength) });
  const removed = answerLine.slice(prefixLength, answerLine.length - suffixLength);
  const added = studentLine.slice(prefixLength, studentLine.length - suffixLength);
  if (removed) tokens.push({ type: 'missing', value: removed });
  if (added) tokens.push({ type: 'wrong', value: added, expected: removed });
  if (suffixLength > 0) tokens.push({ type: 'equal', value: studentLine.slice(studentLine.length - suffixLength) });
  return mergeAdjacentTokens(tokens);
}

function buildLineDiffTokens(answerLine = '', studentLine = '', issueType = 'typo') {
  if (issueType === 'case') return buildCaseTokens(answerLine, studentLine);
  if (!answerLine && studentLine) return [{ type: 'extra', value: studentLine }];
  if (answerLine && !studentLine) return [{ type: 'missing', value: answerLine }];

  const answerChars = Array.from(answerLine);
  const studentChars = Array.from(studentLine);
  const cellCount = answerChars.length * studentChars.length;
  if (cellCount > 80000) return buildFallbackLineDiff(answerLine, studentLine);

  const dp = Array.from({ length: answerChars.length + 1 }, () => Array(studentChars.length + 1).fill(0));
  for (let i = 1; i <= answerChars.length; i += 1) {
    for (let j = 1; j <= studentChars.length; j += 1) {
      dp[i][j] = answerChars[i - 1] === studentChars[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const tokens = [];
  let i = answerChars.length;
  let j = studentChars.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && answerChars[i - 1] === studentChars[j - 1]) {
      tokens.push({ type: 'equal', value: studentChars[j - 1] });
      i -= 1;
      j -= 1;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      tokens.push({ type: issueType === 'whitespace' ? 'extra' : 'wrong', value: studentChars[j - 1] });
      j -= 1;
    } else if (i > 0) {
      tokens.push({ type: 'missing', value: answerChars[i - 1] });
      i -= 1;
    }
  }

  return mergeAdjacentTokens(tokens.reverse());
}

function getLineIssueMessage(issue) {
  const lineLabel = `${issue.lineNumber}번째 줄`;
  if (issue.type === 'missing') return `${lineLabel}: 정답 코드의 이 줄이 빠져 있습니다.`;
  if (issue.type === 'extra') return `${lineLabel}: 정답에는 없는 줄이 더 입력되었습니다.`;
  if (issue.type === 'case') return `${lineLabel}: 대소문자를 확인하세요. Python은 ${shortenCode(issue.answerLine)}와 ${shortenCode(issue.studentLine)}를 다르게 봅니다.`;
  if (issue.type === 'whitespace') return `${lineLabel}: 코드 내용은 거의 같지만 공백, 줄바꿈, 쉼표 뒤 간격이 다릅니다.`;
  if (issue.type === 'indent') return `${lineLabel}: 들여쓰기 단계가 정답과 다릅니다.`;
  if (issue.type === 'punctuation') return `${lineLabel}: 쉼표, 괄호, 콜론이 한글/전각 문자로 입력되었는지 확인하세요.`;
  if (issue.type === 'string') return `${lineLabel}: 문자열 내용은 채점 핵심에서 제외됩니다. 필요하면 아래 문자열 도우미로 정답 문자열을 넣을 수 있습니다.`;
  if (issue.type === 'formatting') return `${lineLabel}: 통과 판정에는 치명적이지 않지만 정답 표기와는 차이가 있습니다.`;
  return `${lineLabel}: ${shortenCode(issue.studentLine)} 부분을 정답 ${shortenCode(issue.answerLine)}와 비교해 보세요.`;
}

// 정답 줄과 학생 줄을 줄-수준 LCS로 최적 정렬한다.
// 줄 하나가 빠지거나 추가되어도 그 이후 줄들이 1:1로 잘못 짝지어지지 않도록,
// 정규화된 줄 키(깊이 단계·토큰 기반)로 공통 부분열을 찾아 정렬 결과를 반환한다.
function alignLines(answerLines = [], studentLines = [], answerIndentRanks = null, studentIndentRanks = null) {
  const answerKeys = answerLines.map(line => normalizePythonLineForCompare(line, answerIndentRanks));
  const studentKeys = studentLines.map(line => normalizePythonLineForCompare(line, studentIndentRanks));
  const aLen = answerLines.length;
  const sLen = studentLines.length;

  // 매칭 키가 같으면 "같은 줄"로 취급해 정렬의 골격을 잡는다.
  const dp = Array.from({ length: aLen + 1 }, () => Array(sLen + 1).fill(0));
  for (let i = aLen - 1; i >= 0; i -= 1) {
    for (let j = sLen - 1; j >= 0; j -= 1) {
      dp[i][j] = answerKeys[i] === studentKeys[j]
        ? dp[i + 1][j + 1] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const pairs = [];
  let i = 0;
  let j = 0;
  while (i < aLen && j < sLen) {
    if (answerKeys[i] === studentKeys[j]) {
      pairs.push({ answerIndex: i, studentIndex: j });
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      // 학생에게 없는 정답 줄(빠진 줄)
      pairs.push({ answerIndex: i, studentIndex: -1 });
      i += 1;
    } else {
      // 정답에 없는 학생 줄(추가된 줄)
      pairs.push({ answerIndex: -1, studentIndex: j });
      j += 1;
    }
  }
  while (i < aLen) { pairs.push({ answerIndex: i, studentIndex: -1 }); i += 1; }
  while (j < sLen) { pairs.push({ answerIndex: -1, studentIndex: j }); j += 1; }
  return pairs;
}

function analyzeCodeDiff(answerCode = '', studentCode = '') {
  const answerEntries = getTraceScoredLineEntries(answerCode);
  const studentEntries = getTraceScoredLineEntries(studentCode);
  const answerLines = answerEntries.map(entry => entry.line);
  const studentLines = studentEntries.map(entry => entry.line);
  const answerIndentRanks = buildIndentRankMap(answerLines);
  const studentIndentRanks = buildIndentRankMap(studentLines);
  const pairs = alignLines(answerLines, studentLines, answerIndentRanks, studentIndentRanks);
  const issues = [];
  const counts = {};

  pairs.forEach((pair) => {
    const hasAnswerLine = pair.answerIndex >= 0;
    const hasStudentLine = pair.studentIndex >= 0;
    const answerLine = hasAnswerLine ? answerLines[pair.answerIndex] : '';
    const studentLine = hasStudentLine ? studentLines[pair.studentIndex] : '';

    let type = null;
    if (hasAnswerLine && !hasStudentLine) {
      type = 'missing';
    } else if (!hasAnswerLine && hasStudentLine) {
      type = 'extra';
    } else if (hasAnswerLine && hasStudentLine) {
      type = classifyLineIssue(answerLine, studentLine, answerIndentRanks, studentIndentRanks);
    }

    if (!type) return;
    counts[type] = (counts[type] || 0) + 1;
    const issue = {
      lineIndex: hasStudentLine
        ? studentEntries[pair.studentIndex]?.originalIndex ?? pair.studentIndex
        : answerEntries[pair.answerIndex]?.originalIndex ?? pair.answerIndex,
      lineNumber: (hasStudentLine
        ? studentEntries[pair.studentIndex]?.originalIndex ?? pair.studentIndex
        : answerEntries[pair.answerIndex]?.originalIndex ?? pair.answerIndex) + 1,
      type,
      answerLine,
      studentLine,
      tokens: buildLineDiffTokens(answerLine, studentLine, type),
    };
    issue.message = getLineIssueMessage(issue);
    issues.push(issue);
  });

  return {
    issues,
    firstIssue: issues[0] || null,
    counts,
    typeLabels: Object.keys(counts).map(type => ISSUE_META[type]?.label || type),
  };
}

function getModeCode(exercise, mode, visibleLines) {
  const answer = normalizeNewlines(exercise.answerCode || '');
  if (mode === 'line') return answer.split('\n').slice(0, visibleLines).join('\n');
  return answer;
}

function getExerciseId(exercise) {
  return exercise?.id || exercise?.docId || '';
}

// 정답 코드 줄 수 기반 기본 보상 (1회차). 라인×1.5, 반올림, 최소 2.
function getExerciseBaseReward(answerCode = '') {
  const lines = normalizeNewlines(answerCode).split('\n').length;
  const raw = lines * LINE_REWARD_RATE;
  return Math.max(MIN_EXERCISE_REWARD, Math.round(raw));
}

// 시도 횟수(1-base)에 따른 보상. 2/3 감쇠, 반올림. MAX_ATTEMPTS 초과 시 0.
function getAttemptReward(base, attempt) {
  const safeAttempt = Math.max(1, Math.floor(Number(attempt) || 1));
  if (safeAttempt > MAX_ATTEMPTS) return 0;
  return Math.round(base * Math.pow(DECAY_FACTOR, safeAttempt - 1));
}

// 시도 횟수 → 남은 보상 회차. 1=첫 보상, 2/3=감소된 보상, 0=보상 소진(연습만)
function remainingRewardedAttempts(attempt) {
  return Math.max(0, MAX_ATTEMPTS - Math.max(0, Math.floor(Number(attempt) || 0)));
}

function getLineCombo(answerCode = '', studentCode = '') {
  const answerLines = mapStringLiterals(getTraceScoredCode(answerCode), () => STRING_STRUCTURE_TOKEN).split('\n');
  const studentLines = mapStringLiterals(getTraceScoredCode(studentCode), () => STRING_STRUCTURE_TOKEN).split('\n');
  const answerIndentRanks = buildIndentRankMap(answerLines);
  const studentIndentRanks = buildIndentRankMap(studentLines);
  let combo = 0;

  for (let i = 0; i < answerLines.length; i += 1) {
    const answerLine = answerLines[i] || '';
    const studentLine = studentLines[i] || '';
    if (!studentLine && answerLine) break;
    if (normalizePythonLineForStructureCompare(answerLine, answerIndentRanks) !== normalizePythonLineForStructureCompare(studentLine, studentIndentRanks)) break;
    combo += 1;
  }
  return combo;
}

function getLineFeedback(answerCode = '', studentCode = '') {
  const answerLines = getTraceScoredLineEntries(answerCode).map(entry => entry.line);
  const studentLines = getTraceScoredLineEntries(studentCode).map(entry => entry.line);
  const answerStructureLines = mapStringLiterals(answerLines.join('\n'), () => STRING_STRUCTURE_TOKEN).split('\n');
  const studentStructureLines = mapStringLiterals(studentLines.join('\n'), () => STRING_STRUCTURE_TOKEN).split('\n');
  const answerIndentRanks = buildIndentRankMap(answerStructureLines);
  const studentIndentRanks = buildIndentRankMap(studentStructureLines);
  const lineCount = Math.max(answerLines.length, studentLines.length, 1);

  return Array.from({ length: lineCount }, (_, index) => {
    const line = answerLines[index] || '';
    const answerLine = answerStructureLines[index] || '';
    const studentLine = studentStructureLines[index] || '';
    const normalizedAnswer = normalizePythonLineForStructureCompare(answerLine, answerIndentRanks);
    const normalizedStudent = normalizePythonLineForStructureCompare(studentLine, studentIndentRanks);
    const done = normalizedAnswer === normalizedStudent && normalizedAnswer.length > 0;
    const typed = Boolean(studentLines[index]);
    const typedRatio = Math.min(1, (studentLine.length || 0) / Math.max(answerLine.length || line.length || 1, 1));
    return {
      lineNumber: index + 1,
      done,
      typed,
      typedRatio,
    };
  });
}

function getLineStringRanges(line = '') {
  const ranges = [];
  let index = 0;
  while (index < line.length) {
    const char = line[index];
    if (char !== '"' && char !== "'") {
      index += 1;
      continue;
    }
    const end = findStringLiteralEnd(line, index);
    if (end < 0) break;
    ranges.push({ start: index, end });
    index = end;
  }
  return ranges;
}

function isIndexInRange(index, ranges = []) {
  return ranges.some(range => index >= range.start && index < range.end);
}

function getCodeTraceCharStatus(answerLine = '', studentLine = '', index = 0, answerIndentRanks = null, studentIndentRanks = null) {
  const answerChar = answerLine[index] || '';
  const studentChar = studentLine[index] || '';

  // 들여쓰기 영역(양쪽 모두 공백인 구간)은 깊이 단계(rank)로 비교한다.
  // 2칸/4칸은 같은 깊이 단계로 정규화되므로 단계만 같으면 match 처리해서
  // "정답은 4칸인데 학생이 2칸"일 때 공백이 갈색으로 표시되는 혼란을 막는다.
  const answerIndent = getLeadingWhitespace(answerLine);
  const studentIndent = getLeadingWhitespace(studentLine);
  const answerIndentLen = answerIndent.length;
  const studentIndentLen = studentIndent.length;
  if (studentChar === ' ' && answerChar === ' '
    && index < Math.min(answerIndentLen, studentIndentLen)) {
    const answerRank = answerIndentRanks?.get(getIndentVisualWidth(answerIndent)) ?? getIndentVisualWidth(answerIndent);
    const studentRank = studentIndentRanks?.get(getIndentVisualWidth(studentIndent)) ?? getIndentVisualWidth(studentIndent);
    return answerRank === studentRank ? 'match' : 'wrong';
  }

  if (studentChar === answerChar) return 'match';
  const answerStringRanges = getLineStringRanges(answerLine);
  const studentStringRanges = getLineStringRanges(studentLine);
  if (isIndexInRange(index, answerStringRanges) && isIndexInRange(index, studentStringRanges)) return 'string';
  if (!answerChar) return 'extra';
  return 'wrong';
}

function buildCodeTraceDecorations(view, answerCode = '') {
  const builder = new RangeSetBuilder();
  const answerLines = getTraceScoredLineEntries(answerCode).map(entry => entry.line);
  const studentCode = view.state.doc.toString();
  const studentRawLines = normalizeNewlines(studentCode).split('\n');
  const studentLines = getTraceScoredLineEntries(studentCode).map(entry => entry.line);
  const answerIndentRanks = buildIndentRankMap(answerLines);
  const studentIndentRanks = buildIndentRankMap(studentLines);
  const scoredIndexByOriginalLine = new Map();
  let scoredIndex = 0;
  studentRawLines.forEach((line, originalIndex) => {
    if (isCommentOnlyLine(line)) return;
    scoredIndexByOriginalLine.set(originalIndex, scoredIndex);
    scoredIndex += 1;
  });

  for (const { from, to } of view.visibleRanges) {
    let pos = from;
    while (pos <= to) {
      const line = view.state.doc.lineAt(pos);
      const lineIndex = line.number - 1;
      if (isCommentOnlyLine(line.text)) {
        if (line.to >= to || line.to >= view.state.doc.length) break;
        pos = line.to + 1;
        continue;
      }
      const scoredLineIndex = scoredIndexByOriginalLine.get(lineIndex) ?? lineIndex;
      const answerLine = answerLines[scoredLineIndex] || '';
      const studentLine = line.text || '';
      if (
        answerLine &&
        normalizePythonLineForStructureCompare(answerLine, answerIndentRanks) === normalizePythonLineForStructureCompare(studentLine, studentIndentRanks)
      ) {
        if (line.to >= to || line.to >= view.state.doc.length) break;
        pos = line.to + 1;
        continue;
      }
      let charPos = line.from;

      Array.from(studentLine).forEach((char, index) => {
        const status = getCodeTraceCharStatus(answerLine, studentLine, index, answerIndentRanks, studentIndentRanks);
        if (status !== 'match') {
          builder.add(
            charPos,
            charPos + char.length,
            Decoration.mark({ class: `code-trace-cm-char code-trace-cm-char--${status}` })
          );
        }
        charPos += char.length;
      });

      if (line.to >= to || line.to >= view.state.doc.length) break;
      pos = line.to + 1;
    }
  }

  return builder.finish();
}

class CodeTraceLineMarker extends GutterMarker {
  constructor({ lineNumber, done, typed, current }) {
    super();
    this.lineNumber = lineNumber;
    this.done = done;
    this.typed = typed;
    this.current = current;
  }

  eq(other) {
    return (
      other.lineNumber === this.lineNumber
      && other.done === this.done
      && other.typed === this.typed
      && other.current === this.current
    );
  }

  toDOM() {
    const marker = document.createElement('span');
    marker.className = [
      'code-trace-cm-line-marker',
      this.typed ? 'is-started' : '',
      this.done ? 'is-done' : '',
      this.current ? 'is-current' : '',
    ].filter(Boolean).join(' ');
    marker.textContent = this.done ? '✓' : String(this.lineNumber);
    return marker;
  }
}

function CodeTraceEditor({
  value,
  answerCode,
  height,
  currentPassed,
  activeStringSuggestion,
  lineCombo,
  indentUnit,
  editorViewRef,
  onChange,
  onSelectionChange,
  onLinePulse,
}) {
  const hostRef = useRef(null);
  const localViewRef = useRef(null);
  const initialValueRef = useRef(value);
  const latestRef = useRef({
    answerCode,
    activeStringSuggestion,
    lineCombo,
    indentUnit,
    onChange,
    onSelectionChange,
    onLinePulse,
  });

  useEffect(() => {
    latestRef.current = {
      answerCode,
      activeStringSuggestion,
      lineCombo,
      indentUnit,
      onChange,
      onSelectionChange,
      onLinePulse,
    };
  }, [activeStringSuggestion, answerCode, indentUnit, lineCombo, onChange, onLinePulse, onSelectionChange]);

  useEffect(() => {
    const view = localViewRef.current;
    if (!view) return;
    view.dispatch({});
  }, [answerCode, value]);

  useEffect(() => {
    if (!hostRef.current) return undefined;

    const codeTracePlugin = ViewPlugin.fromClass(class {
      constructor(view) {
        this.decorations = buildCodeTraceDecorations(view, latestRef.current.answerCode);
      }

      update(update) {
        if (update.docChanged || update.viewportChanged || update.selectionSet || update.transactions.length) {
          this.decorations = buildCodeTraceDecorations(update.view, latestRef.current.answerCode);
        }
      }
    }, {
      decorations: plugin => plugin.decorations,
    });

    const codeTraceGutter = gutter({
      class: 'code-trace-cm-gutter',
      lineMarker(view, line) {
        const docLine = view.state.doc.lineAt(line.from);
        const code = view.state.doc.toString();
        const rawLines = normalizeNewlines(code).split('\n');
        if (isCommentOnlyLine(docLine.text)) {
          return new CodeTraceLineMarker({
            lineNumber: docLine.number,
            done: true,
            typed: true,
            current: view.state.doc.lineAt(view.state.selection.main.head).number === docLine.number,
          });
        }
        const scoredLineIndex = rawLines
          .slice(0, Math.max(0, docLine.number - 1))
          .filter(lineText => !isCommentOnlyLine(lineText))
          .length;
        const lineFeedback = getLineFeedback(latestRef.current.answerCode, code);
        const item = lineFeedback[scoredLineIndex] || {
          lineNumber: docLine.number,
          done: false,
          typed: Boolean(docLine.text),
        };
        const currentLineNumber = view.state.doc.lineAt(view.state.selection.main.head).number;
        return new CodeTraceLineMarker({
          lineNumber: docLine.number,
          done: item.done,
          typed: item.typed,
          current: currentLineNumber === docLine.number,
        });
      },
    });

    const insertStringSuggestion = (view) => {
      const suggestion = latestRef.current.activeStringSuggestion;
      if (!suggestion) return false;
      const selection = view.state.selection.main;
      if (!selection.empty) return false;
      const previousChar = view.state.doc.sliceString(Math.max(0, selection.from - 1), selection.from);
      let insertion = suggestion.literal;
      if ((previousChar === '"' || previousChar === "'") && insertion.startsWith(previousChar)) {
        insertion = insertion.slice(1);
      }
      const nextCursor = selection.from + insertion.length;
      view.dispatch({
        changes: { from: selection.from, to: selection.to, insert: insertion },
        selection: EditorSelection.cursor(nextCursor),
        effects: EditorView.scrollIntoView(nextCursor, { x: 'end', y: 'nearest' }),
      });
      soundManager.playClick();
      return true;
    };

    const handleEnter = (view) => {
      const selection = view.state.selection.main;
      if (!selection.empty) return false;
      const line = view.state.doc.lineAt(selection.from);
      const linePrefix = view.state.doc.sliceString(line.from, selection.from);
      const currentIndent = linePrefix.match(/^[ \t]*/)?.[0] || '';
      const codeBeforeComment = linePrefix.replace(/#.*$/, '').trimEnd();
      const nextIndent = `${currentIndent}${codeBeforeComment.endsWith(':') ? (latestRef.current.indentUnit || STUDENT_INDENT) : ''}`;
      const insertion = `\n${nextIndent}`;
      const nextCursor = selection.from + insertion.length;
      view.dispatch({
        changes: { from: selection.from, to: selection.to, insert: insertion },
        selection: EditorSelection.cursor(nextCursor),
        effects: EditorView.scrollIntoView(nextCursor, { x: 'start', y: 'nearest' }),
      });
      soundManager.playClick();
      latestRef.current.onLinePulse?.(latestRef.current.lineCombo);
      return true;
    };

    const editorTheme = EditorView.theme({
      '&': {
        height: `${height}px`,
        minHeight: `${CODE_PANEL_MIN_HEIGHT}px`,
        maxHeight: `${CODE_PANEL_MAX_HEIGHT}px`,
        borderRadius: '10px',
        border: '1px solid rgba(255,255,255,0.12)',
        backgroundColor: '#020617',
        color: '#f8fafc',
        overflow: 'hidden',
      },
      '&.cm-focused': {
        outline: '1px solid rgba(56,189,248,0.85)',
      },
      '.cm-scroller': {
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontSize: '0.92rem',
        lineHeight: '1.55',
        overflow: 'auto',
      },
      '.cm-content': {
        padding: '1rem 1rem',
        caretColor: '#f8fafc',
        minHeight: `${CODE_PANEL_MIN_HEIGHT - CODE_PANEL_VERTICAL_PADDING_PX}px`,
      },
      '.cm-line': {
        padding: '0',
      },
      '.cm-gutters': {
        backgroundColor: '#020617',
        color: 'rgba(148,163,184,0.72)',
        borderRight: '1px solid rgba(148,163,184,0.08)',
        paddingLeft: '0.65rem',
        paddingRight: '0.4rem',
      },
      '.cm-activeLineGutter': {
        backgroundColor: 'transparent',
      },
      '.cm-activeLine': {
        backgroundColor: 'rgba(56,189,248,0.06)',
      },
      '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
        backgroundColor: 'rgba(56,189,248,0.28)',
      },
      '.cm-cursor': {
        borderLeftColor: 'var(--crystal-cyan)',
      },
    });

    const view = new EditorView({
      parent: hostRef.current,
      state: EditorState.create({
        doc: initialValueRef.current,
        extensions: [
          history(),
          python(),
          syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
          codeTracePlugin,
          codeTraceGutter,
          editorTheme,
          keymap.of([
            {
              key: 'Tab',
              preventDefault: true,
              run: view => insertStringSuggestion(view) || indentMore(view),
            },
            {
              key: 'Shift-Tab',
              preventDefault: true,
              run: indentLess,
            },
            {
              key: 'Enter',
              preventDefault: true,
              run: handleEnter,
            },
            ...historyKeymap,
            ...defaultKeymap,
          ]),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              latestRef.current.onChange?.(update.state.doc.toString());
            }
            if (update.selectionSet || update.docChanged) {
              const selection = update.state.selection.main;
              latestRef.current.onSelectionChange?.({
                start: selection.from,
                end: selection.to,
              });
            }
          }),
        ],
      }),
    });

    localViewRef.current = view;
    if (editorViewRef) editorViewRef.current = view;

    return () => {
      if (editorViewRef?.current === view) editorViewRef.current = null;
      localViewRef.current = null;
      view.destroy();
    };
  }, [editorViewRef, height]);

  useEffect(() => {
    const view = localViewRef.current;
    if (!view) return;
    const currentValue = view.state.doc.toString();
    if (currentValue === value) return;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: value },
      selection: EditorSelection.cursor(Math.min(value.length, view.state.selection.main.head)),
    });
  }, [value]);

  return <div ref={hostRef} className={`code-trace-codemirror ${currentPassed ? 'is-passed' : ''}`} />;
}

export default function CodeTracePlayer({
  exercises = [],
  unitId,
  unitTitle,
  activeUnit,
  clusterId,
  learningProgress,
  onClose
}) {
  const { user } = useAuth();
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [mode, setMode] = useState('recall');
  const [visibleLines, setVisibleLines] = useState(1);
  const [answerVisible, setAnswerVisible] = useState(true);
  const [revealSeconds, setRevealSeconds] = useState(ANSWER_REVEAL_SECONDS);
  const [studentCode, setStudentCode] = useState('');
  const [hintIndex, setHintIndex] = useState(0);
  const [completedIds, setCompletedIds] = useState(() => new Set(learningProgress?.codeTrace?.completedExerciseIds || []));
  // 세트별 작성 초안 보존. { [exerciseId]: studentCode }. 세트를 옮겨도 돌아오면 복원됨.
  const [drafts, setDrafts] = useState(() => ({ ...(learningProgress?.codeTrace?.drafts || {}) }));
  // exerciseAttempts: { [exerciseId]: 시도횟수 }. 레거시 earnedExerciseIds는 시도 1회로 간주.
  const [exerciseAttempts, setExerciseAttempts] = useState(() => {
    const attempts = { ...(learningProgress?.codeTrace?.exerciseAttempts || {}) };
    const legacyEarned = learningProgress?.codeTrace?.earnedExerciseIds;
    if (Array.isArray(legacyEarned)) {
      legacyEarned.forEach((id) => {
        if (id && !attempts[id]) attempts[id] = 1;
      });
    }
    return attempts;
  });
  const [crystalsEarnedTotal, setCrystalsEarnedTotal] = useState(() => Number(learningProgress?.codeTrace?.crystalsEarnedTotal || 0));
  const [completionState, setCompletionState] = useState(null);
  const [rewardBurst, setRewardBurst] = useState(null);
  const [linePulse, setLinePulse] = useState(null);
  const [saving, setSaving] = useState(false);
  const [analysisLevel, setAnalysisLevel] = useState('line');
  const [showWhitespace, setShowWhitespace] = useState(true);
  const [studentSelection, setStudentSelection] = useState({ start: 0, end: 0 });
  const previousLineComboRef = useRef(0);
  const studentEditorViewRef = useRef(null);

  useEffect(() => {
    const savedIds = learningProgress?.codeTrace?.completedExerciseIds;
    if (Array.isArray(savedIds)) {
      setCompletedIds(new Set(savedIds));
    }
  }, [learningProgress?.codeTrace?.completedExerciseIds]);

  useEffect(() => {
    const attempts = { ...(learningProgress?.codeTrace?.exerciseAttempts || {}) };
    const legacyEarned = learningProgress?.codeTrace?.earnedExerciseIds;
    if (Array.isArray(legacyEarned)) {
      legacyEarned.forEach((id) => {
        if (id && !attempts[id]) attempts[id] = 1;
      });
    }
    setExerciseAttempts(attempts);
  }, [learningProgress?.codeTrace?.exerciseAttempts, learningProgress?.codeTrace?.earnedExerciseIds]);

  useEffect(() => {
    setCrystalsEarnedTotal(Number(learningProgress?.codeTrace?.crystalsEarnedTotal || 0));
  }, [learningProgress?.codeTrace?.crystalsEarnedTotal]);

  const exercise = exercises[exerciseIndex] || null;
  const requiredAnswerCode = useMemo(
    () => getTraceScoredCode(exercise?.answerCode || ''),
    [exercise]
  );
  const evaluation = useMemo(
    () => evaluateCode(requiredAnswerCode, studentCode),
    [requiredAnswerCode, studentCode]
  );
  const analysis = useMemo(
    () => analyzeCodeDiff(requiredAnswerCode, studentCode),
    [requiredAnswerCode, studentCode]
  );
  const stringSuggestions = useMemo(
    () => extractStringLiteralSuggestions(requiredAnswerCode),
    [requiredAnswerCode]
  );
  const commentSuggestions = useMemo(
    () => extractCommentLineSuggestions(exercise?.answerCode || ''),
    [exercise]
  );
  const activeStringSuggestion = useMemo(
    () => getStringSuggestionAtCursor(stringSuggestions, studentCode, studentSelection.start),
    [stringSuggestions, studentCode, studentSelection.start]
  );
  const passingAccuracy = exercise?.passingAccuracy || 95;
  const currentPassed = evaluation.perfect || evaluation.accuracy >= passingAccuracy;
  const currentExerciseIds = useMemo(() => exercises.map(getExerciseId).filter(Boolean), [exercises]);
  const currentCompletedCount = useMemo(
    () => currentExerciseIds.filter(id => completedIds.has(id)).length,
    [currentExerciseIds, completedIds]
  );
  const allCompleted = currentExerciseIds.length > 0 && currentCompletedCount >= currentExerciseIds.length;
  const hint = exercise?.hints?.[Math.min(hintIndex, Math.max(0, (exercise?.hints?.length || 1) - 1))] || '';
  const currentExerciseId = getExerciseId(exercise);
  const currentAttemptCount = Number(exerciseAttempts[currentExerciseId] || 0);
  const exerciseBaseReward = getExerciseBaseReward(requiredAnswerCode);
  const nextAttemptNumber = currentAttemptCount + 1;
  // 이번 통과로 받을 보상(배율 적용 전). 4회차+는 0.
  const rawRewardForNextPass = getAttemptReward(exerciseBaseReward, nextAttemptNumber);
  const rewardStillAvailable = remainingRewardedAttempts(currentAttemptCount) > 0;
  const unitAlreadyCompleted = !!learningProgress?.codeTrace?.completed;
  const currentAlreadyCompleted = !!currentExerciseId && completedIds.has(currentExerciseId);
  const canSubmitCurrentPass = currentPassed && !currentAlreadyCompleted && !saving && completionState !== 'processing';
  const willCompleteOnPass = !unitAlreadyCompleted && currentPassed && currentExerciseId && !currentAlreadyCompleted && currentCompletedCount + 1 >= currentExerciseIds.length;
  const firstIncompleteIndex = useMemo(
    () => exercises.findIndex(item => !completedIds.has(getExerciseId(item))),
    [exercises, completedIds]
  );
  const hasIncomplete = firstIncompleteIndex >= 0;
  const hasIncompleteElsewhere = firstIncompleteIndex >= 0 && firstIncompleteIndex !== exerciseIndex;
  // 세트 이동은 항상 자유롭게. 단 다음/이전 인덱스 범위만 확인.
  const canGoPrev = exerciseIndex > 0;
  const canGoNext = exerciseIndex < exercises.length - 1;
  // 미완료 코드로 건너뛰기 강조 버튼: 미완료가 있고 현재가 아닐 때.
  const nextIncompleteIndex = useMemo(() => {
    if (firstIncompleteIndex < 0) return -1;
    const afterCurrent = exercises.findIndex((item, index) => index > exerciseIndex && !completedIds.has(getExerciseId(item)));
    return afterCurrent >= 0 ? afterCurrent : firstIncompleteIndex;
  }, [completedIds, exerciseIndex, exercises, firstIncompleteIndex]);
  const canMoveToIncompleteCode = hasIncompleteElsewhere && nextIncompleteIndex >= 0 && nextIncompleteIndex !== exerciseIndex;
  const lineCombo = useMemo(
    () => getLineCombo(requiredAnswerCode, studentCode),
    [requiredAnswerCode, studentCode]
  );
  // 정답 코드의 들여쓰기 단위를 감지해 학생 입력란의 자동 인덴트에 그대로 적용.
  // 정답이 4칸이면 Enter 시 4칸, 탭이면 탭으로 자동 들여쓰기되어 시각적 혼란을 줄인다.
  const indentUnit = useMemo(
    () => detectIndentUnit(requiredAnswerCode),
    [requiredAnswerCode]
  );
  // 현재 세트의 입력을 빈 상태로 되돌림 (초기화 버튼). 초안도 함께 비움.
  const resetExercise = () => {
    if (currentExerciseId) {
      setDrafts(prev => ({ ...prev, [currentExerciseId]: '' }));
    }
    setStudentCode('');
    setVisibleLines(1);
    setHintIndex(0);
    setAnswerVisible(true);
    setRevealSeconds(ANSWER_REVEAL_SECONDS);
    setLinePulse(null);
    previousLineComboRef.current = 0;
    setStudentSelection({ start: 0, end: 0 });
  };

  // 세트를 전환하되, 떠나는 세트의 작성 코드는 초안에 저장하고
  // 들어가는 세트의 저장된 초안을 복원한다. 통과한 세트는 초안을 비워 깔끔하게 시작.
  const goToExercise = (nextIndex) => {
    if (nextIndex < 0 || nextIndex >= exercises.length || nextIndex === exerciseIndex) return;
    const leavingId = currentExerciseId;
    const nextDrafts = { ...drafts };
    if (leavingId) {
      nextDrafts[leavingId] = currentPassed ? '' : studentCode;
    }
    setDrafts(nextDrafts);
    const targetId = getExerciseId(exercises[nextIndex]);
    setExerciseIndex(nextIndex);
    setStudentCode(nextDrafts[targetId] || '');
    setVisibleLines(1);
    setHintIndex(0);
    setAnswerVisible(true);
    setRevealSeconds(ANSWER_REVEAL_SECONDS);
    setLinePulse(null);
    previousLineComboRef.current = 0;
    setStudentSelection({ start: 0, end: 0 });
  };

  useEffect(() => {
    previousLineComboRef.current = 0;
    setLinePulse(null);
  }, [exerciseIndex, mode]);

  useEffect(() => {
    if (lineCombo > previousLineComboRef.current && lineCombo > 0) {
      soundManager.playClick();
      setLinePulse({ id: Date.now(), count: lineCombo });
    }
    previousLineComboRef.current = lineCombo;
  }, [lineCombo]);

  useEffect(() => {
    if (!rewardBurst) return undefined;
    const timer = setTimeout(() => setRewardBurst(null), 1200);
    return () => clearTimeout(timer);
  }, [rewardBurst]);

  useEffect(() => {
    if (!exercises.length || unitAlreadyCompleted || firstIncompleteIndex < 0) return;
    const currentId = getExerciseId(exercises[exerciseIndex]);
    if (!currentId || completedIds.has(currentId)) {
      const targetId = getExerciseId(exercises[firstIncompleteIndex]);
      setExerciseIndex(firstIncompleteIndex);
      setStudentCode(drafts[targetId] || '');
      setVisibleLines(1);
      setHintIndex(0);
      setAnswerVisible(true);
      setRevealSeconds(ANSWER_REVEAL_SECONDS);
      setLinePulse(null);
      previousLineComboRef.current = 0;
      setStudentSelection({ start: 0, end: 0 });
    }
  }, [completedIds, exerciseIndex, exercises, firstIncompleteIndex, unitAlreadyCompleted, drafts]);

  useEffect(() => {
    if (!answerVisible) return undefined;
    setRevealSeconds(ANSWER_REVEAL_SECONDS);
    const timer = setInterval(() => {
      setRevealSeconds(prev => {
        if (prev <= 1) {
          setAnswerVisible(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [answerVisible, exerciseIndex, mode, visibleLines]);

  if (!exercise) {
    return (
      <div className="space-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
          <h2 className="font-title" style={{ color: 'var(--crystal-cyan)' }}>CODE TRACE</h2>
          <p className="font-tech" style={{ color: 'var(--text-muted)' }}>등록된 코드 따라쓰기 항목이 없습니다.</p>
          <button className="hud-btn secondary glass" onClick={onClose}>돌아가기</button>
        </div>
      </div>
    );
  }

  const changeMode = (nextMode) => {
    if (currentExerciseId) {
      setDrafts(prev => ({ ...prev, [currentExerciseId]: '' }));
    }
    setMode(nextMode);
    setVisibleLines(1);
    setAnswerVisible(true);
    setRevealSeconds(ANSWER_REVEAL_SECONDS);
    setStudentCode('');
    setHintIndex(0);
    setStudentSelection({ start: 0, end: 0 });
  };

  const revealAnswer = () => {
    setAnswerVisible(true);
    setRevealSeconds(ANSWER_REVEAL_SECONDS);
  };

  // options.autoAdvance: 통과 후 자동으로 다음 미완료 세트로 이동할지.
  // 통과 버튼 직접 클릭 시엔 true(기본), leaveCurrentExercise로 이동 중엔 false(목적지를 직접 제어).
  const markCurrentPassed = async ({ autoAdvance = true } = {}) => {
    if (!user || !unitId || !currentPassed || currentAlreadyCompleted || !currentExerciseId || completionState === 'processing') return;
    setSaving(true);

    try {
      const today = getTodayKST();
      const userRef = doc(db, 'users', user.uid);
      const progressRef = doc(db, 'users', user.uid, 'learning_progress', unitId);
      const historyRef = doc(db, 'users', user.uid, 'history', `code_trace_${today}_${unitId}`);
      const unitTitleValue = unitTitle || activeUnit?.title || '코드 따라쓰기';
      const baseReward = getExerciseBaseReward(requiredAnswerCode);

      const result = await runTransaction(db, async (transaction) => {
        const userSnap = await transaction.get(userRef);
        const progressSnap = await transaction.get(progressRef);
        const historySnap = await transaction.get(historyRef);
        if (!userSnap.exists()) throw new Error('User document not found');

        const freshUser = userSnap.data();
        const freshProgress = progressSnap.exists() ? progressSnap.data() : {};
        const freshCodeTrace = freshProgress.codeTrace || {};
        const freshCompletedIds = new Set(Array.isArray(freshCodeTrace.completedExerciseIds) ? freshCodeTrace.completedExerciseIds : []);
        // 시도 횟수 객체 (레거시 earnedExerciseIds는 1회로 간주)
        const freshAttempts = { ...(freshCodeTrace.exerciseAttempts || {}) };
        const legacyEarned = freshCodeTrace.earnedExerciseIds;
        if (Array.isArray(legacyEarned)) {
          legacyEarned.forEach((id) => { if (id && !freshAttempts[id]) freshAttempts[id] = 1; });
        }
        freshCompletedIds.add(currentExerciseId);

        // 이번 통과의 시도 번호(1-base)와 보상. 4회차+는 보상 0이지만 시도 횟수는 계속 증가.
        const attemptNumber = (Number(freshAttempts[currentExerciseId] || 0) || 0) + 1;
        freshAttempts[currentExerciseId] = attemptNumber;
        const rawReward = getAttemptReward(baseReward, attemptNumber);
        // 휴일/수업시간 외 배율 적용 (퀴즈·영상·데이터로그와 동일)
        const multiplierMeta = applyCrystalRewardMultiplier(rawReward, { clusterId: clusterId || 'python' });
        const actualReward = multiplierMeta.amount;

        const completedExerciseIds = currentExerciseIds.filter(id => freshCompletedIds.has(id));
        const completedExerciseCount = completedExerciseIds.length;
        const isNowCompleted = completedExerciseCount >= currentExerciseIds.length;
        const wasCompleted = !!freshCodeTrace.completed;
        const alreadyRecordedToday = historySnap.exists();
        const nextCrystalsEarnedTotal = Number(freshCodeTrace.crystalsEarnedTotal || 0) + actualReward;
        const bestAccuracy = Math.max(Number(freshCodeTrace.bestAccuracy || 0), evaluation.accuracy || 0);

        const userUpdates = {
          lastActive: serverTimestamp(),
        };

        if (isNowCompleted && !wasCompleted) {
          const streakCalc = calculateStreakUpdate(freshUser);
          const streakUpdates = streakCalc.streakUpdate || {};
          userUpdates.totalCodeTraces = (freshUser.totalCodeTraces || 0) + (alreadyRecordedToday ? 0 : 1);
          Object.assign(userUpdates, streakUpdates);
          if (Object.keys(streakUpdates).length > 0) {
            userUpdates.streakWriteAudit = buildStreakWriteAudit({
              source: 'code_trace_complete',
              writerUid: user.uid,
              prevState: freshUser,
              nextState: {
                currentStreak: streakUpdates.currentStreak,
                lastStreakDate: streakUpdates.lastStreakDate,
                streakFreezeCount: streakUpdates.streakFreezeCount,
              },
              writtenAt: serverTimestamp(),
              note: unitId,
            });
          }
        }

        if (actualReward > 0) {
          userUpdates.crystals = (freshUser.crystals || 0) + actualReward;
          Object.assign(userUpdates, calculateGrowthUpdates(freshUser, actualReward));
          recordCrystalTransaction(user.uid, {
            amount: actualReward,
            type: 'code_trace_exercise_reward',
            description: `${unitTitleValue} ${exerciseIndex + 1}/${exercises.length} 통과 (${attemptNumber}회차)`,
            metadata: {
              unitId,
              unitTitle: unitTitleValue,
              exerciseId: currentExerciseId,
              exerciseTitle: exercise.title || '',
              exerciseIndex: exerciseIndex + 1,
              exerciseCount: exercises.length,
              attemptNumber,
              baseAmount: multiplierMeta.baseAmount,
              bonusAmount: multiplierMeta.bonusAmount,
              rewardMultiplier: multiplierMeta.multiplier,
              rewardMultiplierLabel: multiplierMeta.label,
              accuracy: evaluation.accuracy,
              lineCombo,
            }
          }, transaction, `code_trace_${unitId}_${currentExerciseId}_attempt${attemptNumber}`);
        }

        transaction.update(userRef, userUpdates);
        transaction.set(progressRef, {
          unitTitle: unitTitleValue,
          chapterId: activeUnit?.chapterId || '',
          clusterId: clusterId || 'python',
          codeTrace: {
            completed: isNowCompleted,
            ...(isNowCompleted ? { completedAt: serverTimestamp() } : {}),
            chapterId: activeUnit?.chapterId || '',
            clusterId: clusterId || 'python',
            completedExerciseIds,
            exerciseAttempts: freshAttempts,
            completedExerciseCount,
            totalExerciseCount: exercises.length,
            crystalsEarnedTotal: nextCrystalsEarnedTotal,
            bestAccuracy,
            lastExerciseId: currentExerciseId,
            lastMode: mode,
            updatedAt: serverTimestamp()
          },
          updatedAt: serverTimestamp()
        }, { merge: true });

        if (isNowCompleted) {
          transaction.set(historyRef, {
            type: 'code_trace',
            unitId,
            unitTitle: unitTitleValue,
            chapterId: activeUnit?.chapterId || '',
            clusterId: clusterId || 'python',
            score: bestAccuracy,
            accuracy: bestAccuracy,
            completedExerciseCount,
            totalExerciseCount: exercises.length,
            crystalsEarned: nextCrystalsEarnedTotal,
            timestamp: serverTimestamp()
          }, { merge: true });
        }

        return {
          actualReward,
          attemptNumber,
          completed: isNowCompleted,
          completedExerciseIds,
          exerciseAttempts: freshAttempts,
          completedExerciseCount,
          crystalsEarnedTotal: nextCrystalsEarnedTotal,
          bestAccuracy,
        };
      });

      setCompletedIds(new Set(result.completedExerciseIds));
      setExerciseAttempts(result.exerciseAttempts);
      setCrystalsEarnedTotal(result.crystalsEarnedTotal);

      if (result.actualReward > 0) {
        soundManager.playCrystal();
        setRewardBurst({ id: Date.now(), amount: result.actualReward, attempt: result.attemptNumber });
      } else {
        soundManager.playCorrect();
      }

      if (result.completed) {
        soundManager.playLevelUp();
        setCompletionState({
          actualReward: result.actualReward,
          totalEarned: result.crystalsEarnedTotal,
          accuracy: result.bestAccuracy,
        });
        return;
      }

      // 통과 후 자동으로 다음 미완료 세트로 이동 (첫 통과 시에만). 반복 연습 중엔 현재 세트에 머묾.
      // leaveCurrentExercise로 이동 중(autoAdvance=false)엔 목적지를 호출자가 제어하므로 건너뜀.
      if (autoAdvance && result.attemptNumber === 1) {
        const nextCompletedSet = new Set(result.completedExerciseIds);
        const nextIndex = exercises.findIndex((item, index) => index > exerciseIndex && !nextCompletedSet.has(getExerciseId(item)));
        const fallbackIndex = exercises.findIndex(item => !nextCompletedSet.has(getExerciseId(item)));
        const targetIndex = nextIndex >= 0 ? nextIndex : fallbackIndex;
        if (targetIndex >= 0 && targetIndex !== exerciseIndex) {
          goToExercise(targetIndex);
        }
      }
    } catch (err) {
      console.error(err);
      setCompletionState({ error: err.message });
    } finally {
      setSaving(false);
    }
  };

  // 통과 가능 상태에서 다른 세트로 이동하려 할 때 광석을 놓치지 않도록 자동 통과 처리.
  // 미통과 작성 중 이동이면 초안만 보존하고 이동.
  const leaveCurrentExercise = async (nextIndex) => {
    if (nextIndex < 0 || nextIndex >= exercises.length || nextIndex === exerciseIndex) return;
    // 통과 기준 만족 + 아직 이번 회차 보상이 남은 세트 → 자동으로 통과 처리 후 목적지로 이동.
    // autoAdvance=false 로 두어 markCurrentPassed가 다른 세트로 멋대로 보내지 않게 함.
    if (canSubmitCurrentPass && rewardStillAvailable && currentExerciseId) {
      await markCurrentPassed({ autoAdvance: false });
    }
    goToExercise(nextIndex);
  };

  const savePartialProgress = async () => {
    if (!user || !unitId) return;
    setSaving(true);
    try {
      const progressRef = doc(db, 'users', user.uid, 'learning_progress', unitId);
      const filteredAttempts = {};
      const filteredDrafts = {};
      currentExerciseIds.forEach((id) => {
        if (id && exerciseAttempts[id]) filteredAttempts[id] = exerciseAttempts[id];
        if (id && drafts[id]) filteredDrafts[id] = drafts[id];
      });
      // 현재 세트의 작성 코드도 초안에 포함 (방금 친 코드 보존)
      if (currentExerciseId && studentCode && !currentAlreadyCompleted) {
        filteredDrafts[currentExerciseId] = studentCode;
      }
      await setDoc(progressRef, {
        unitTitle: unitTitle || activeUnit?.title || '',
        chapterId: activeUnit?.chapterId || '',
        clusterId: clusterId || 'python',
        codeTrace: {
          completed: false,
          chapterId: activeUnit?.chapterId || '',
          clusterId: clusterId || 'python',
          completedExerciseIds: currentExerciseIds.filter(id => completedIds.has(id)),
          exerciseAttempts: filteredAttempts,
          drafts: filteredDrafts,
          completedExerciseCount: currentCompletedCount,
          totalExerciseCount: exercises.length,
          crystalsEarnedTotal,
          bestAccuracy: Math.max(learningProgress?.codeTrace?.bestAccuracy || 0, evaluation.accuracy || 0),
          lastExerciseId: exercise.id || exercise.docId,
          lastMode: mode,
          updatedAt: serverTimestamp()
        },
        updatedAt: serverTimestamp()
      }, { merge: true });
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  const completeCodeTrace = async (completedIdSet = completedIds) => {
    const completedExerciseIds = currentExerciseIds.filter(id => completedIdSet.has(id));
    const completedExerciseCount = completedExerciseIds.length;
    if (!user || completedExerciseCount < currentExerciseIds.length || completionState === 'processing') return;
    setCompletionState('processing');
    try {
      const today = getTodayKST();
      const userRef = doc(db, 'users', user.uid);
      const progressRef = doc(db, 'users', user.uid, 'learning_progress', unitId);
      const historyRef = doc(db, 'users', user.uid, 'history', `code_trace_${today}_${unitId}`);

      const result = await runTransaction(db, async (transaction) => {
        const userSnap = await transaction.get(userRef);
        const progressSnap = await transaction.get(progressRef);
        const historySnap = await transaction.get(historyRef);
        if (!userSnap.exists()) throw new Error('User document not found');

        const freshUser = userSnap.data();
        const freshProgress = progressSnap.exists() ? progressSnap.data() : {};
        const alreadyRecordedToday = historySnap.exists();
        const freshAttemptsRaw = freshProgress?.codeTrace?.exerciseAttempts || {};
        const filteredAttempts = {};
        currentExerciseIds.forEach((id) => {
          if (id && freshAttemptsRaw[id]) filteredAttempts[id] = freshAttemptsRaw[id];
        });
        const nextCrystalsEarnedTotal = Number(freshProgress?.codeTrace?.crystalsEarnedTotal || crystalsEarnedTotal || 0);
        const streakCalc = calculateStreakUpdate(freshUser);
        const streakUpdates = streakCalc.streakUpdate || {};

        const userUpdates = {
          lastActive: serverTimestamp(),
          totalCodeTraces: (freshUser.totalCodeTraces || 0) + (alreadyRecordedToday ? 0 : 1),
          ...streakUpdates
        };

        if (Object.keys(streakUpdates).length > 0) {
          userUpdates.streakWriteAudit = buildStreakWriteAudit({
            source: 'code_trace_complete',
            writerUid: user.uid,
            prevState: freshUser,
            nextState: {
              currentStreak: streakUpdates.currentStreak,
              lastStreakDate: streakUpdates.lastStreakDate,
              streakFreezeCount: streakUpdates.streakFreezeCount,
            },
            writtenAt: serverTimestamp(),
            note: unitId,
          });
        }

        transaction.update(userRef, userUpdates);
        transaction.set(progressRef, {
          unitTitle: unitTitle || activeUnit?.title || '',
          chapterId: activeUnit?.chapterId || '',
          clusterId: clusterId || 'python',
          codeTrace: {
            completed: true,
            completedAt: serverTimestamp(),
            chapterId: activeUnit?.chapterId || '',
            clusterId: clusterId || 'python',
            completedExerciseIds,
            exerciseAttempts: filteredAttempts,
            completedExerciseCount,
            totalExerciseCount: exercises.length,
            crystalsEarnedTotal: nextCrystalsEarnedTotal,
            bestAccuracy: Math.max(freshProgress?.codeTrace?.bestAccuracy || 0, evaluation.accuracy || 0),
            updatedAt: serverTimestamp()
          },
          updatedAt: serverTimestamp()
        }, { merge: true });

        transaction.set(historyRef, {
          type: 'code_trace',
          unitId,
          unitTitle: unitTitle || activeUnit?.title || '코드 따라쓰기',
          chapterId: activeUnit?.chapterId || '',
          clusterId: clusterId || 'python',
          score: evaluation.accuracy,
          accuracy: evaluation.accuracy,
          completedExerciseCount,
          totalExerciseCount: exercises.length,
          crystalsEarned: nextCrystalsEarnedTotal,
          timestamp: serverTimestamp()
        }, { merge: true });

        return { actualReward: 0, totalEarned: nextCrystalsEarnedTotal, streak: streakUpdates.currentStreak || streakCalc.meta?.newStreak || freshUser.currentStreak || 0 };
      });

      soundManager.playLevelUp();
      setCompletionState(result);
    } catch (err) {
      console.error(err);
      setCompletionState({ error: err.message });
    }
  };

  const answerCode = getModeCode({ ...exercise, answerCode: requiredAnswerCode }, mode, visibleLines);
  const totalLines = normalizeNewlines(requiredAnswerCode || '').split('\n').length;
  const visibleAnswerLineCount = Math.max(1, normalizeNewlines(answerCode || '').split('\n').length);
  const codePanelHeight = Math.min(
    CODE_PANEL_MAX_HEIGHT,
    Math.max(
      CODE_PANEL_MIN_HEIGHT,
      (visibleAnswerLineCount * CODE_PANEL_LINE_HEIGHT_PX) + CODE_PANEL_VERTICAL_PADDING_PX
    )
  );
  const preventAnswerCopy = (event) => {
    event.preventDefault();
  };
  const preventAnswerCopyShortcut = (event) => {
    if ((event.metaKey || event.ctrlKey) && ['a', 'c', 'x'].includes(String(event.key || '').toLowerCase())) {
      event.preventDefault();
    }
  };
  const getStudentLineRange = (lineIndex) => {
    const lines = normalizeNewlines(studentCode).split('\n');
    let start = 0;
    for (let index = 0; index < Math.min(lineIndex, lines.length); index += 1) {
      start += lines[index].length + 1;
    }
    const line = lines[lineIndex] || '';
    return { start, end: start + line.length };
  };
  const jumpToFirstIssue = () => {
    const view = studentEditorViewRef.current;
    if (!analysis.firstIssue || !view) return;
    const { start, end } = getStudentLineRange(analysis.firstIssue.lineIndex);
    const safeStart = Math.min(start, studentCode.length);
    const safeEnd = Math.min(Math.max(start, end), studentCode.length);
    view.focus();
    view.dispatch({
      selection: EditorSelection.range(safeStart, safeEnd),
      effects: EditorView.scrollIntoView(safeStart, { y: 'center', x: 'start' }),
    });
  };
  const renderDiffTokens = (tokens = []) => tokens.map((token, index) => {
    const displayValue = showWhitespace ? visibleWhitespace(token.value) : token.value;
    const missingValue = showWhitespace ? visibleWhitespace(token.value) : token.value;
    const title = token.expected ? `정답: ${token.expected}` : undefined;
    if (token.type === 'equal') {
      return <span key={index}>{displayValue}</span>;
    }
    if (token.type === 'missing') {
      return (
        <span key={index} className="code-trace-diff-token code-trace-diff-token--missing" title="정답에는 있지만 학생 입력에는 빠진 부분">
          {missingValue}
        </span>
      );
    }
    if (token.type === 'extra') {
      return (
        <span key={index} className="code-trace-diff-token code-trace-diff-token--extra" title="정답에는 없는 추가 입력">
          {displayValue}
        </span>
      );
    }
    if (token.type === 'case') {
      return (
        <span key={index} className="code-trace-diff-token code-trace-diff-token--case" title={title}>
          {displayValue}
        </span>
      );
    }
    return (
      <span key={index} className="code-trace-diff-token code-trace-diff-token--wrong" title={title}>
        {displayValue}
      </span>
    );
  });
  const insertStringLiteral = (suggestion = activeStringSuggestion) => {
    const view = studentEditorViewRef.current;
    if (!suggestion || !view) return false;
    const selection = view.state.selection.main;
    const previousChar = view.state.doc.sliceString(Math.max(0, selection.from - 1), selection.from);
    let insertion = suggestion.literal;

    if ((previousChar === '"' || previousChar === "'") && insertion.startsWith(previousChar)) {
      insertion = insertion.slice(1);
    }

    const nextCursor = selection.from + insertion.length;
    view.dispatch({
      changes: { from: selection.from, to: selection.to, insert: insertion },
      selection: EditorSelection.cursor(nextCursor),
      effects: EditorView.scrollIntoView(nextCursor, { x: 'end', y: 'nearest' }),
    });
    setStudentSelection({ start: nextCursor, end: nextCursor });
    view.focus();
    soundManager.playClick();
    return true;
  };
  const insertCommentLine = (suggestion) => {
    const view = studentEditorViewRef.current;
    if (!suggestion || !view) return false;
    const selection = view.state.selection.main;
    const line = view.state.doc.lineAt(selection.from);
    const lineText = line.text || '';
    const currentIndent = lineText.match(/^[ \t]*/)?.[0] || '';
    const comment = `${currentIndent}${suggestion.literal}`;
    const lineHasContent = Boolean(lineText.trim());
    const from = lineHasContent ? selection.from : line.from;
    const to = lineHasContent ? selection.to : line.to;
    const insertion = lineHasContent ? `\n${comment}\n${currentIndent}` : comment;
    const nextCursor = from + insertion.length;
    view.dispatch({
      changes: { from, to, insert: insertion },
      selection: EditorSelection.cursor(nextCursor),
      effects: EditorView.scrollIntoView(nextCursor, { x: 'start', y: 'nearest' }),
    });
    setStudentSelection({ start: nextCursor, end: nextCursor });
    view.focus();
    soundManager.playClick();
    return true;
  };
  const pulseEditorLine = (combo) => {
    setLinePulse({ id: Date.now(), count: combo, enter: true });
  };

  return (
    <div className="space-bg" style={{ minHeight: '100vh', overflowY: 'auto', padding: '1rem 1rem 4rem' }}>
      <style>{`
        @keyframes codeTraceLinePulse {
          0% { transform: translateY(4px); opacity: 0; filter: blur(2px); }
          30% { transform: translateY(0); opacity: 1; filter: blur(0); }
          100% { transform: translateY(-8px); opacity: 0; filter: blur(2px); }
        }
        @keyframes codeTraceCrystalFly {
          0% { transform: translate(-50%, 8px) scale(0.9); opacity: 0; }
          20% { transform: translate(-50%, 0) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -72px) scale(1.08); opacity: 0; }
        }
        @keyframes codeTracePassGlow {
          0%, 100% { box-shadow: 0 0 0 rgba(34,197,94,0); }
          50% { box-shadow: 0 0 24px rgba(34,197,94,0.35); }
        }
        @keyframes codeTraceCompleteSheen {
          0% { transform: translateX(-130%) skewX(-18deg); opacity: 0; }
          25% { opacity: 0.8; }
          100% { transform: translateX(160%) skewX(-18deg); opacity: 0; }
        }
        @keyframes codeTraceCheckPop {
          0% { transform: scale(0.55); opacity: 0; }
          70% { transform: scale(1.12); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes codeTraceCharGlow {
          0% { text-shadow: 0 0 0 rgba(52,211,153,0); }
          100% { text-shadow: 0 0 12px rgba(52,211,153,0.7); }
        }
        .code-trace-student-panel {
          overflow: visible;
        }
        .code-trace-student-panel.is-complete::after {
          content: "";
          position: absolute;
          inset: -20%;
          width: 45%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.16), transparent);
          animation: codeTraceCompleteSheen 1.8s ease-out infinite;
          pointer-events: none;
        }
        .code-trace-codemirror.is-passed .cm-editor {
          border-color: rgba(34,197,94,0.55) !important;
          animation: codeTracePassGlow 1.6s ease-in-out infinite;
        }
        .code-trace-cm-line-marker {
          width: 1.35rem;
          height: 1.35rem;
          border-radius: 999px;
          border: 1px solid rgba(148,163,184,0.22);
          background: rgba(15,23,42,0.78);
          color: rgba(148,163,184,0.68);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 0.62rem;
          line-height: 1;
          box-shadow: inset 0 0 8px rgba(2,6,23,0.55);
          transform: translateY(0.04rem);
        }
        .code-trace-cm-line-marker.is-started {
          border-color: rgba(56,189,248,0.35);
          color: rgba(186,230,253,0.95);
        }
        .code-trace-cm-line-marker.is-current {
          border-color: rgba(0,243,255,0.62);
          box-shadow: 0 0 12px rgba(0,243,255,0.24), inset 0 0 8px rgba(2,6,23,0.55);
        }
        .code-trace-cm-line-marker.is-done {
          color: #052e16;
          border-color: rgba(52,211,153,0.72);
          background: linear-gradient(135deg, #86efac, #22c55e);
          animation: codeTraceCheckPop 0.28s ease-out both;
          box-shadow: 0 0 14px rgba(34,197,94,0.34);
        }
        .code-trace-cm-char {
          border-radius: 4px;
        }
        .code-trace-cm-char--string {
          color: #bbf7d0;
          background: rgba(52,211,153,0.12);
        }
        .code-trace-cm-char--wrong {
          color: #fecaca;
          background: rgba(248,113,113,0.22);
        }
        .code-trace-cm-char--extra {
          color: #fed7aa;
          background: rgba(251,146,60,0.24);
        }
        .code-trace-analysis-panel {
          margin-top: 1rem;
          display: grid;
          grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
          gap: 1rem;
        }
        .code-trace-analysis-box {
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          background: rgba(2,6,23,0.62);
          padding: 0.9rem;
          min-width: 0;
        }
        .code-trace-analysis-toolbar {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.8rem;
        }
        .code-trace-chip-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.45rem;
        }
        .code-trace-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          padding: 0.28rem 0.55rem;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(15,23,42,0.76);
          color: #dbeafe;
          font-size: 0.72rem;
        }
        .code-trace-string-helper {
          margin-top: 0.7rem;
          padding: 0.65rem;
          border-radius: 10px;
          border: 1px solid rgba(52,211,153,0.22);
          background: rgba(6,78,59,0.16);
        }
        .code-trace-string-helper-title {
          margin: 0 0 0.45rem;
          color: #bbf7d0;
          font-size: 0.75rem;
        }
        .code-trace-comment-helper {
          border-color: rgba(251,146,60,0.22);
          background: rgba(124,45,18,0.14);
        }
        .code-trace-comment-helper .code-trace-string-helper-title {
          color: #fed7aa;
        }
        .code-trace-string-chip {
          border: 1px solid rgba(52,211,153,0.28);
          background: rgba(15,23,42,0.82);
          color: #d1fae5;
          border-radius: 999px;
          padding: 0.35rem 0.6rem;
          cursor: pointer;
          max-width: min(100%, 20rem);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .code-trace-string-chip:hover,
        .code-trace-string-chip.is-active {
          border-color: rgba(52,211,153,0.72);
          background: rgba(16,185,129,0.18);
          color: #ecfdf5;
        }
        .code-trace-comment-chip {
          border-color: rgba(251,146,60,0.28);
          color: #ffedd5;
        }
        .code-trace-comment-chip:hover {
          border-color: rgba(251,146,60,0.72);
          background: rgba(251,146,60,0.16);
          color: #fff7ed;
        }
        .code-trace-issue-list {
          display: grid;
          gap: 0.55rem;
          margin: 0;
          padding: 0;
          list-style: none;
        }
        .code-trace-issue-item {
          border: 1px solid rgba(255,255,255,0.08);
          border-left: 3px solid rgba(248,113,113,0.8);
          border-radius: 8px;
          background: rgba(15,23,42,0.58);
          color: #d1d5db;
          padding: 0.65rem 0.75rem;
          line-height: 1.45;
        }
        .code-trace-diff-preview {
          margin: 0;
          min-height: 180px;
          max-height: 360px;
          overflow: auto;
          border-radius: 10px;
          background: #020617;
          border: 1px solid rgba(255,255,255,0.1);
          padding: 0.85rem;
          color: #e5e7eb;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 0.86rem;
          line-height: 1.55;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }
        .code-trace-diff-line {
          display: grid;
          grid-template-columns: 3.2rem minmax(0, 1fr);
          gap: 0.55rem;
          min-height: 1.45rem;
        }
        .code-trace-diff-line-number {
          color: rgba(148,163,184,0.72);
          user-select: none;
          text-align: right;
        }
        .code-trace-diff-token {
          border-radius: 4px;
          padding: 0.02rem 0.08rem;
        }
        .code-trace-diff-token--wrong {
          background: rgba(248,113,113,0.24);
          color: #fecaca;
          text-decoration: underline;
          text-decoration-color: rgba(248,113,113,0.9);
          text-underline-offset: 0.18rem;
        }
        .code-trace-diff-token--missing {
          background: rgba(248,113,113,0.18);
          color: #fca5a5;
          border-bottom: 2px solid rgba(248,113,113,0.9);
          opacity: 0.95;
        }
        .code-trace-diff-token--extra {
          background: rgba(251,146,60,0.24);
          color: #fed7aa;
          text-decoration: line-through;
          text-decoration-color: rgba(251,146,60,0.9);
        }
        .code-trace-diff-token--case {
          background: rgba(250,204,21,0.24);
          color: #fef08a;
          border-bottom: 2px solid rgba(250,204,21,0.9);
        }
        @media (max-width: 860px) {
          .code-trace-analysis-panel {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      <div style={{ maxWidth: 1220, margin: '0 auto' }}>
        <button className="space-nav-link font-tech" onClick={onClose} style={{ marginBottom: '1rem' }}>
          <ChevronLeft size={16} /> RETURN TO MISSION CONTROL
        </button>

        <header style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-end', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h1 className="font-title" style={{ color: 'var(--crystal-cyan)', margin: 0, fontSize: '1.8rem' }}>CODE TRACE: {unitTitle || activeUnit?.title}</h1>
            <p className="font-tech" style={{ color: 'var(--text-muted)', margin: '0.5rem 0 0' }}>
              DATA LOG의 정답 코드를 손으로 따라 쓰며 문법 패턴을 익힙니다.
            </p>
          </div>
          <button className="hud-btn secondary glass" onClick={savePartialProgress} disabled={saving}>
            <Save size={16} /> 오늘은 여기까지
          </button>
        </header>

        <div className="glass-card hud-border" style={{ padding: '1rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <div className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                {exerciseIndex + 1} / {exercises.length} · {exercise.category} · Level {exercise.level}
              </div>
              <h2 style={{ margin: '0.35rem 0', color: 'var(--text-bright)' }}>{exercise.title}</h2>
              <p className="font-tech" style={{ color: 'var(--text-muted)', margin: 0 }}>{exercise.prompt}</p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {['recall', 'line'].map(item => (
                <button
                  key={item}
                  className={`hud-btn ${mode === item ? 'primary' : 'secondary'} glass`}
                  onClick={() => changeMode(item)}
                  style={{ padding: '0.55rem 0.8rem' }}
                >
                  {item === 'line' ? '한 줄씩' : '가리고 쓰기'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 세트 스텝퍼 — 각 세트의 진행 상황과 연습 횟수를 한눈에. 클릭하여 자유롭게 이동 */}
        <div className="glass-card" style={{ padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginRight: '0.25rem' }}>세트</span>
          {exercises.map((item, index) => {
            const id = getExerciseId(item);
            const isCurrent = index === exerciseIndex;
            const isDone = id && completedIds.has(id);
            const attempts = Number(exerciseAttempts[id] || 0);
            const lineCount = normalizeNewlines(item?.answerCode || '').split('\n').length;
            return (
              <button
                key={id || index}
                onClick={() => { leaveCurrentExercise(index); }}
                className="font-tech"
                title={`${item?.title || `${index + 1}번`} · ${lineCount}줄${attempts > 0 ? ` · ${attempts}회 연습` : ''}`}
                style={{
                  minWidth: 36,
                  padding: '0.35rem 0.55rem',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                  background: isCurrent
                    ? 'rgba(0,243,255,0.18)'
                    : isDone
                      ? 'rgba(34,197,94,0.12)'
                      : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isCurrent ? 'rgba(0,243,255,0.55)' : isDone ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.1)'}`,
                  color: isCurrent ? 'var(--crystal-cyan)' : isDone ? '#22c55e' : 'var(--text-muted)',
                  boxShadow: isCurrent ? '0 0 12px rgba(0,243,255,0.25)' : 'none'
                }}
              >
                <span>{index + 1}</span>
                {isDone && <span style={{ fontSize: '0.7rem' }}>✓</span>}
                {attempts > 1 && <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>×{attempts}</span>}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '1rem' }}>
          <section className="glass-card" style={{ padding: '1rem', minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 className="font-title" style={{ margin: 0, color: 'var(--planet-green)' }}>정답 코드</h3>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {mode === 'line' && (
                  <button className="hud-btn secondary glass" onClick={() => setVisibleLines(v => Math.min(totalLines, v + 1))} style={{ padding: '0.45rem 0.7rem' }}>
                    다음 줄
                  </button>
                )}
                {answerVisible ? (
                  <span className="font-tech" style={{ color: 'var(--text-muted)', padding: '0.45rem 0.2rem', fontSize: '0.82rem' }}>
                    자동 가림 {revealSeconds}s
                  </span>
                ) : (
                  <button className="hud-btn secondary glass" onClick={revealAnswer} style={{ padding: '0.45rem 0.7rem' }}>
                    <Eye size={15} /> 보이기 30초
                  </button>
                )}
              </div>
            </div>
            <pre
              tabIndex={0}
              onCopy={preventAnswerCopy}
              onCut={preventAnswerCopy}
              onPaste={preventAnswerCopy}
              onContextMenu={preventAnswerCopy}
              onSelect={preventAnswerCopy}
              onKeyDown={preventAnswerCopyShortcut}
              style={{ boxSizing: 'border-box', width: '100%', maxWidth: '100%', height: codePanelHeight, minHeight: CODE_PANEL_MIN_HEIGHT, maxHeight: CODE_PANEL_MAX_HEIGHT, margin: 0, padding: '1rem', borderRadius: 10, background: '#020617', color: '#e5e7eb', overflow: 'auto', whiteSpace: 'pre', filter: answerVisible ? 'none' : 'blur(5px)', userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', fontSize: '0.92rem', lineHeight: 1.55 }}
            >
              {answerCode}
            </pre>
          </section>

          <section className={`glass-card code-trace-student-panel ${currentPassed ? 'is-complete' : ''}`} style={{ padding: '1rem', minWidth: 0, position: 'relative' }}>
            <h3 className="font-title" style={{ margin: '0 0 0.75rem', color: 'var(--crystal-cyan)' }}>학생 입력</h3>
            {linePulse && (
              <div
                key={linePulse.id}
                className="font-tech"
                style={{
                  position: 'absolute',
                  right: '1.2rem',
                  top: '3.05rem',
                  zIndex: 2,
                  color: linePulse.enter ? 'var(--crystal-cyan)' : '#22c55e',
                  background: 'rgba(2,6,23,0.82)',
                  border: `1px solid ${linePulse.enter ? 'rgba(0,243,255,0.28)' : 'rgba(34,197,94,0.3)'}`,
                  borderRadius: 999,
                  padding: '0.25rem 0.55rem',
                  fontSize: '0.72rem',
                  animation: 'codeTraceLinePulse 1.1s ease-out forwards',
                  pointerEvents: 'none'
                }}
              >
                {linePulse.enter ? '라인 입력' : `${linePulse.count}줄 콤보`}
              </div>
            )}
            <CodeTraceEditor
              value={studentCode}
              answerCode={requiredAnswerCode}
              height={codePanelHeight}
              currentPassed={currentPassed}
              activeStringSuggestion={activeStringSuggestion}
              lineCombo={lineCombo}
              indentUnit={indentUnit}
              editorViewRef={studentEditorViewRef}
              onChange={setStudentCode}
              onSelectionChange={setStudentSelection}
              onLinePulse={pulseEditorLine}
            />
            {stringSuggestions.length > 0 && (
              <div className="code-trace-string-helper">
                <p className="font-tech code-trace-string-helper-title">문자열 도우미</p>
                <div className="code-trace-chip-row">
                  {stringSuggestions.slice(0, 8).map((suggestion) => (
                    <button
                      key={suggestion.id}
                      type="button"
                      className={`font-tech code-trace-string-chip ${activeStringSuggestion?.id === suggestion.id ? 'is-active' : ''}`}
                      title={`${suggestion.lineNumber}번째 줄 문자열`}
                      onMouseDown={event => event.preventDefault()}
                      onClick={() => insertStringLiteral(suggestion)}
                    >
                      {suggestion.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {commentSuggestions.length > 0 && (
              <div className="code-trace-string-helper code-trace-comment-helper">
                <p className="font-tech code-trace-string-helper-title">선택 주석</p>
                <div className="code-trace-chip-row">
                  {commentSuggestions.slice(0, 8).map((suggestion) => (
                    <button
                      key={suggestion.id}
                      type="button"
                      className="font-tech code-trace-string-chip code-trace-comment-chip"
                      title={`${suggestion.lineNumber}번째 줄 주석 · 채점 제외`}
                      onMouseDown={event => event.preventDefault()}
                      onClick={() => insertCommentLine(suggestion)}
                    >
                      {suggestion.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap', position: 'relative' }}>
              {rewardBurst && (
                <div
                  key={rewardBurst.id}
                  className="font-tech"
                  style={{
                    position: 'absolute',
                    left: '8rem',
                    top: '-0.35rem',
                    zIndex: 3,
                    color: 'var(--star-gold)',
                    fontWeight: 'bold',
                    textShadow: '0 0 14px rgba(251,191,36,0.75)',
                    animation: 'codeTraceCrystalFly 1.1s ease-out forwards',
                    pointerEvents: 'none'
                  }}
                >
                  +{rewardBurst.amount} 광석{rewardBurst.attempt ? ` (${rewardBurst.attempt}회차)` : ''}
                </div>
              )}
              <button className="hud-btn primary glass" onClick={markCurrentPassed} disabled={!canSubmitCurrentPass}>
                <Check size={16} /> {
                  currentAlreadyCompleted
                    ? '통과 완료'
                    : currentPassed
                    ? (rewardStillAvailable
                      ? `통과하고 +${rawRewardForNextPass}광석${nextAttemptNumber > 1 ? ` (${nextAttemptNumber}회차)` : ''} 획득`
                      : (currentAttemptCount > 0 ? '다시 통과하기 · 보상 완료' : `구조 기준 ${passingAccuracy}%`))
                    : `구조 기준 ${passingAccuracy}%`
                }
              </button>
              <button className="hud-btn secondary glass" onClick={() => {
                setHintIndex(i => i + 1);
              }}>
                <Lightbulb size={16} /> 힌트
              </button>
              <button className="hud-btn secondary glass" onClick={resetExercise}>
                <RotateCcw size={16} /> 초기화
              </button>
            </div>
          </section>
        </div>

        <section className="glass-card" style={{ padding: '1rem', marginTop: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
            {[
              ['구조 정확도', `${evaluation.accuracy}%`],
              ['맞은 줄', `${evaluation.correctLines}/${evaluation.totalLines}`],
              ['첫 오류', analysis.firstIssue ? `${analysis.firstIssue.lineNumber}번째 줄` : '없음'],
              ['오류 유형', analysis.typeLabels.length ? analysis.typeLabels.slice(0, 2).join(' · ') : '없음'],
              ['라인 콤보', `${lineCombo}/${evaluation.totalLines}`],
              ['연습', currentAttemptCount > 0 ? `${currentAttemptCount}회` : '—'],
              ['획득 광석', `${crystalsEarnedTotal}`],
              ['완료', `${currentCompletedCount}/${exercises.length}`]
            ].map(([label, value]) => (
              <div key={label} style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '0.85rem' }}>
                <strong style={{ display: 'block', color: 'var(--text-bright)', fontSize: '1.25rem' }}>{value}</strong>
                <span className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{label}</span>
              </div>
            ))}
          </div>

          {hint && hintIndex > 0 && (
            <div className="font-tech" style={{ borderLeft: '3px solid var(--crystal-cyan)', background: 'rgba(0,243,255,0.08)', padding: '0.8rem', marginBottom: '1rem', color: '#dbeafe' }}>
              {hint}
            </div>
          )}

          <div className="font-tech" style={{ color: currentPassed ? 'var(--planet-green)' : 'var(--text-muted)', marginBottom: '0.75rem' }}>
            {currentAlreadyCompleted
              ? '이 세트는 이미 통과 처리되었습니다. 다시 눌러도 보상이나 기록을 중복 처리하지 않습니다.'
              : currentPassed
              ? (rewardStillAvailable
                ? (willCompleteOnPass
                  ? `마지막 세트입니다. 통과하면 +${rawRewardForNextPass}광석을 받고 CODE TRACE가 완료됩니다.`
                  : `통과 기준을 만족했습니다. 지금 +${rawRewardForNextPass}광석을 받을 수 있습니다.`)
                : (currentAttemptCount > 0
                  ? `이미 ${currentAttemptCount}회 통과했습니다. 다시 연습해도 광석은 더 나오지 않지만, 코드 감각을 익히는 데 도움이 됩니다.`
                  : `통과 기준: 구조 정확도 ${passingAccuracy}% 이상`))
              : `통과 기준: 구조 정확도 ${passingAccuracy}% 이상`}
          </div>

          {!currentPassed && (
            <ul className="font-tech" style={{ color: '#d1d5db', margin: 0, paddingLeft: '1.2rem' }}>
              {evaluation.issues.map((issue, index) => <li key={index}>{issue}</li>)}
            </ul>
          )}

          <div className="code-trace-analysis-panel">
            <div className="code-trace-analysis-box">
              <div className="code-trace-analysis-toolbar">
                <h3 className="font-title" style={{ margin: 0, color: 'var(--crystal-cyan)', fontSize: '1rem' }}>오류 분석</h3>
                <button className="hud-btn secondary glass" onClick={jumpToFirstIssue} disabled={!analysis.firstIssue} style={{ padding: '0.42rem 0.65rem' }}>
                  <LocateFixed size={15} /> 첫 오류
                </button>
              </div>

              <div className="code-trace-chip-row" style={{ marginBottom: '0.8rem' }}>
                {Object.entries(analysis.counts).length ? Object.entries(analysis.counts).map(([type, count]) => (
                  <span key={type} className="code-trace-chip" style={{ borderColor: `${ISSUE_META[type]?.color || '#94a3b8'}66` }}>
                    <span style={{ width: 7, height: 7, borderRadius: 999, background: ISSUE_META[type]?.color || '#94a3b8' }} />
                    {ISSUE_META[type]?.label || type} {count}
                  </span>
                )) : (
                  <span className="code-trace-chip" style={{ borderColor: 'rgba(34,197,94,0.38)', color: '#bbf7d0' }}>정답 코드와 같습니다</span>
                )}
              </div>

              {analysis.issues.length ? (
                <ul className="code-trace-issue-list font-tech">
                  {analysis.issues.slice(0, 5).map(issue => (
                    <li key={`${issue.lineNumber}-${issue.type}`} className="code-trace-issue-item" style={{ borderLeftColor: ISSUE_META[issue.type]?.color || '#f87171' }}>
                      {issue.message}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="font-tech" style={{ margin: 0, color: '#bbf7d0' }}>현재 입력은 정답 코드와 완전히 일치합니다.</p>
              )}
            </div>

            <div className="code-trace-analysis-box">
              <div className="code-trace-analysis-toolbar">
                <h3 className="font-title" style={{ margin: 0, color: 'var(--planet-green)', fontSize: '1rem' }}>오류 위치 보기</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                  <button className={`hud-btn ${analysisLevel === 'line' ? 'primary' : 'secondary'} glass`} onClick={() => setAnalysisLevel('line')} style={{ padding: '0.42rem 0.65rem' }}>
                    틀린 줄
                  </button>
                  <button className={`hud-btn ${analysisLevel === 'char' ? 'primary' : 'secondary'} glass`} onClick={() => setAnalysisLevel('char')} style={{ padding: '0.42rem 0.65rem' }}>
                    글자 단위
                  </button>
                  <button className={`hud-btn ${showWhitespace ? 'primary' : 'secondary'} glass`} onClick={() => setShowWhitespace(value => !value)} style={{ padding: '0.42rem 0.65rem' }}>
                    공백 {showWhitespace ? '켜짐' : '꺼짐'}
                  </button>
                </div>
              </div>

              {analysis.issues.length ? (
                <div className="code-trace-diff-preview">
                  {analysis.issues.slice(0, analysisLevel === 'line' ? 8 : 12).map(issue => (
                    <div key={`${issue.lineNumber}-${issue.type}-preview`} className="code-trace-diff-line">
                      <span className="code-trace-diff-line-number">{issue.lineNumber}</span>
                      <code>
                        {analysisLevel === 'line'
                          ? (showWhitespace
                            ? visibleWhitespace(issue.studentLine || (issue.type === 'missing' ? '(빈 줄)' : issue.answerLine))
                            : (issue.studentLine || (issue.type === 'missing' ? '(빈 줄)' : issue.answerLine)))
                          : renderDiffTokens(issue.tokens)}
                      </code>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="code-trace-diff-preview" style={{ color: '#bbf7d0' }}>정답과 다른 부분이 없습니다.</div>
              )}
            </div>
          </div>
        </section>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="hud-btn secondary glass" disabled={!canGoPrev || saving} onClick={() => leaveCurrentExercise(exerciseIndex - 1)}>
            <ChevronLeft size={16} /> 이전 코드
          </button>
          {allCompleted && !completionState && !unitAlreadyCompleted ? (
            <button className="hud-btn primary glass" onClick={completeCodeTrace} disabled={completionState === 'processing'}>
              <Check size={17} /> 완료 기록 마무리
            </button>
          ) : null}
          <button className="hud-btn secondary glass" disabled={!canGoNext || saving} onClick={() => leaveCurrentExercise(exerciseIndex + 1)}>
            다음 코드 <ChevronLeft size={16} style={{ transform: 'rotate(180deg)' }} />
          </button>
        </div>

        {hasIncomplete && canMoveToIncompleteCode && !allCompleted && !completionState && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.75rem' }}>
            <button className="hud-btn primary glass" disabled={saving} onClick={() => leaveCurrentExercise(nextIncompleteIndex)}>
              {hasIncompleteElsewhere ? '미통과 코드로 건너뛰기' : '미통과 코드로 이동'}
            </button>
          </div>
        )}

        {completionState && completionState !== 'processing' && (
          <div className="glass-card hud-border" style={{ marginTop: '1rem', padding: '1rem', textAlign: 'center' }}>
            {completionState.error ? (
              <p className="font-tech" style={{ color: 'var(--alert-red)' }}>{completionState.error}</p>
            ) : (
              <>
                <h3 className="font-title" style={{ color: 'var(--planet-green)', marginTop: 0 }}>CODE TRACE 완료</h3>
                <p className="font-tech" style={{ color: 'var(--text-muted)' }}>
                  구조 정확도 {completionState.accuracy || evaluation.accuracy}% · 이번 세트 +{completionState.actualReward || 0} 광석 · 누적 {completionState.totalEarned ?? crystalsEarnedTotal}광석
                </p>
                <button className="hud-btn primary glass" onClick={onClose}>미션 컨트롤로 돌아가기</button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

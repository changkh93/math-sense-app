import { repairLatexControlChars } from './latexTextRepair.js';

// 백슬래시가 빠진 LaTeX 명령어는 영문 단어의 일부가 아닌 완전한 토큰일 때만
// 복원한다. 예: "frac{1}{2}" -> "\\frac{1}{2}", "fraction" -> 그대로.
// 경계 검사가 없으면 fraction, pilot 같은 일반 단어까지 \fraction, \pilot으로
// 바뀌어 KaTeX 오류 또는 뜻이 다른 기호로 표시된다.
const LOST_LATEX_SYMBOL_PATTERN = /(?<![\\A-Za-z])(xrightarrow|xleftarrow|rightarrow|leftarrow|Rightarrow|Leftarrow|overline|underline|implies|triangle|parallel|cdot|times|frac|sqrt|quad|qquad|div|neq|leq|geq|left|right|circ|perp|pm|pi|theta|alpha|beta|gamma|Delta|Omega)(?![A-Za-z])/g;

// 인자를 받는 명령어(text, boxed 등). 영문 텍스트 단어와 충돌하므로
// 바로 뒤에 { 가 올 때(즉 실제 명령어 호출일 때)만 백슬래시를 복원한다.
// 예: "boxed{1}" -> "\boxed{1}" (복원), "the boxed value" -> 그대로 (미복원)
const LOST_LATEX_BRACED_PATTERN = /(?<![\\A-Za-z])(text|boxed)(?=\s*\{)/g;

export const protectLatexTextBlocks = (text) => {
  if (!text || typeof text !== 'string') return { protectedText: text, protectedBlocks: [] };
  const protectedBlocks = [];
  const regex = /\\(?:text|mbox|mathrm|textbf|textit|htmlData)\s*\{/g;
  let result = '';
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const startIndex = match.index;
    const braceStart = match.index + match[0].length - 1;
    let depth = 1;
    let i = braceStart + 1;
    while (i < text.length && depth > 0) {
      if (text[i] === '\\') {
        i += 2;
        continue;
      }
      if (text[i] === '{') depth++;
      else if (text[i] === '}') depth--;
      i++;
    }
    if (depth === 0) {
      result += text.slice(lastIndex, startIndex);
      const fullMacro = text.slice(startIndex, i);
      const token = `@@LATEX_TEXT_MACRO_${protectedBlocks.length}@@`;
      protectedBlocks.push(fullMacro);
      result += token;
      lastIndex = i;
      regex.lastIndex = i;
    }
  }
  result += text.slice(lastIndex);
  return { protectedText: result, protectedBlocks };
};

export const restoreLatexTextBlocks = (text, protectedBlocks) => {
  if (!text || typeof text !== 'string' || !protectedBlocks?.length) return text;
  return text.replace(/@@LATEX_TEXT_MACRO_(\d+)@@/g, (_, index) => protectedBlocks[Number(index)] || '');
};

export const ensureKoreanInTextMacro = (latexStr) => {
  if (!latexStr || typeof latexStr !== 'string') return latexStr;
  
  // Protect existing \text{...}, \mbox{...}, \mathrm{...}, \htmlData{...} blocks
  const { protectedText, protectedBlocks } = protectLatexTextBlocks(latexStr);

  // Wrap remaining raw Korean words with \text{...}
  const wrapped = protectedText.replace(/([ㄱ-ㅎ|ㅏ-ㅣ|가-힣]+(?:\s+[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]+)*)/g, '\\text{$1}');

  // Restore protected blocks
  return restoreLatexTextBlocks(wrapped, protectedBlocks);
};

export const protectExistingLatexCommands = (text) => {
  const protectedCommands = [];
  const protectedText = text.replace(/\\[a-zA-Z]+/g, (match) => {
    const token = `@@LATEX_CMD_${protectedCommands.length}@@`;
    protectedCommands.push(match);
    return token;
  });

  return { protectedText, protectedCommands };
};

export const restoreProtectedLatexCommands = (text, protectedCommands) => (
  text.replace(/@@LATEX_CMD_(\d+)@@/g, (_, index) => protectedCommands[Number(index)] || '')
);

export const restoreLostLatexCommandSlashes = (text) => {
  // \text{...}, \mathrm{...} 등 텍스트 매크로 블록 내부는 수식이 아닌 일반 텍스트이므로
  // 그 안의 triangle, times 같은 영문 단어에 백슬래시를 강제로 붙이지 않도록 먼저 보호한다.
  const { protectedText: textWithoutMacros, protectedBlocks } = protectLatexTextBlocks(text);
  const { protectedText, protectedCommands } = protectExistingLatexCommands(textWithoutMacros);
  const repaired = protectedText
    .replace(LOST_LATEX_SYMBOL_PATTERN, '\\$1')
    .replace(LOST_LATEX_BRACED_PATTERN, '\\$1');
  const restoredCommands = restoreProtectedLatexCommands(repaired, protectedCommands);
  return restoreLatexTextBlocks(restoredCommands, protectedBlocks);
};

export const normalizeEscapedNewlines = (text) => {
  if (!text || typeof text !== 'string') return text;
  // 인라인 코드(`...`) 영역 안의 \\n 같은 리터럴은 변환하면 안 된다.
  // 코드 표기 자체가 정답인 경우(예: 파일 입출력 단원의 "\\n") 텍스트가 사라지기 때문이다.
  // 백틱 구간을 자리표시자로 빼두고, 변환 후에 원래 값으로 복원한다.
  // 토큰엔 일반 텍스트에 절대 들어가지 않을 연속 기호를 쓴다.
  const CODE_TOKEN_START = '@@INLINECODE_';
  const codeSegments = [];
  const withPlaceholders = text.replace(/`[^`]*`/g, (match) => {
    const token = `${CODE_TOKEN_START}${codeSegments.length}@@`;
    codeSegments.push(match);
    return token;
  });

  const normalized = withPlaceholders
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n(?![a-zA-Z])/g, '\n')
    .replace(/\\r(?![a-zA-Z])/g, '\n');

  return codeSegments.length
    ? normalized.replace(/@@INLINECODE_(\d+)@@/g, (_, index) => codeSegments[Number(index)] || '')
    : normalized;
};

/**
 * 제어문자로 깨진 LaTeX 명령어를 `\t`/`\r`/`\f`/`\v`/`\b` 역변환으로 되돌린다.
 */
export const repairControlCharsToLatex = (text, options) => repairLatexControlChars(normalizeEscapedNewlines(text), options);

/**
 * 렌더용 LaTeX 정제. 제어문자 역변환 뒤 한글 `\text{}` 래핑 등 화면 표시를 위한
 * 후처리를 더한다. KaTeX/인라인 포맷터에 넘기기 직전에 호출한다.
 */
export const sanitizeLaTeX = (text) => {
  if (!text || typeof text !== 'string') return text;
  let raw = text.trim();
  if (raw.startsWith('$$') && raw.endsWith('$$') && raw.length >= 4) raw = raw.slice(2, -2).trim();
  else if (raw.startsWith('\\[') && raw.endsWith('\\]') && raw.length >= 4) raw = raw.slice(2, -2).trim();
  else if (raw.startsWith('\\(') && raw.endsWith('\\)') && raw.length >= 4) raw = raw.slice(2, -2).trim();
  else if (raw.startsWith('$') && raw.endsWith('$') && raw.length >= 2) raw = raw.slice(1, -1).trim();

  const restoredSlashes = restoreLostLatexCommandSlashes(repairControlCharsToLatex(raw, { assumeMath: true }))
    .replace(/[\t\f\v\b]/g, ' ')
    .trim();
  return ensureKoreanInTextMacro(restoredSlashes);
};

/**
 * 운영툴에서 사람이 편집할 원본 텍스트를 정제한다.
 */
export const repairLaTeXForEditing = (text) => {
  if (!text || typeof text !== 'string') return text;
  return restoreLostLatexCommandSlashes(repairControlCharsToLatex(text)).trim();
};

export const URL_MATCH_PATTERN = /(https?:\/\/[^\s<>"']+)/gi;

export const trimUrlToken = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  return rawUrl.replace(/[.,!?;:)\]}]+$/g, '');
};

export const extractPlainUrls = (text) => {
  if (!text || typeof text !== 'string') return [];

  const urls = [];
  const seen = new Set();
  const normalizedText = normalizeEscapedNewlines(text);
  const matches = normalizedText.matchAll(new RegExp(URL_MATCH_PATTERN));

  for (const match of matches) {
    const url = trimUrlToken(match[0]);
    if (!url || seen.has(url)) continue;
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) continue;
      seen.add(url);
      urls.push(url);
    } catch {
      // Ignore malformed URL-like text.
    }
  }

  return urls;
};

export const getYouTubeVideoId = (url) => {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();

    if (host === 'youtu.be') {
      return parsed.pathname.split('/').filter(Boolean)[0] || '';
    }

    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      if (parsed.searchParams.get('v')) return parsed.searchParams.get('v');

      const pathParts = parsed.pathname.split('/').filter(Boolean);
      if (['shorts', 'embed', 'live'].includes(pathParts[0]) && pathParts[1]) {
        return pathParts[1];
      }
    }
  } catch {
    return '';
  }

  return '';
};

export const getUrlPreviewData = (url) => {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    const youtubeId = getYouTubeVideoId(url);

    if (youtubeId) {
      return {
        url,
        host,
        type: 'youtube',
        title: 'YouTube 영상',
        subtitle: host,
        imageUrl: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`
      };
    }

    return {
      url,
      host,
      type: 'link',
      title: host,
      subtitle: parsed.hostname,
      imageUrl: ''
    };
  } catch {
    return null;
  }
};

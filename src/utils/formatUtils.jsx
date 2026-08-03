import React from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

// 백슬래시가 빠진 LaTeX 명령어는 영문 단어의 일부가 아닌 완전한 토큰일 때만
// 복원한다. 예: "frac{1}{2}" -> "\\frac{1}{2}", "fraction" -> 그대로.
// 경계 검사가 없으면 fraction, pilot 같은 일반 단어까지 \fraction, \pilot으로
// 바뀌어 KaTeX 오류 또는 뜻이 다른 기호로 표시된다.
const LOST_LATEX_SYMBOL_PATTERN = /(?<![\\A-Za-z])(xrightarrow|xleftarrow|rightarrow|leftarrow|Rightarrow|Leftarrow|overline|underline|implies|triangle|parallel|cdot|times|frac|sqrt|quad|qquad|div|neq|leq|geq|left|right|circ|perp|pm|pi|theta|alpha|beta|gamma|Delta|Omega)(?![A-Za-z])/g;
// 인자를 받는 명령어(text, boxed 등). 영문 텍스트 단어와 충돌하므로
// 바로 뒤에 { 가 올 때(즉 실제 명령어 호출일 때)만 백슬래시를 복원한다.
// 예: "boxed{1}" -> "\boxed{1}" (복원), "the boxed value" -> 그대로 (미복원)
const LOST_LATEX_BRACED_PATTERN = /(?<![\\A-Za-z])(text|boxed)(?=\s*\{)/g;
const CONTROL_CHARS = {
  formFeed: String.fromCharCode(0x0c),
  verticalTab: String.fromCharCode(0x0b),
  backspace: String.fromCharCode(0x08),
  tab: String.fromCharCode(0x09),
  lineFeed: String.fromCharCode(0x0a),
  carriageReturn: String.fromCharCode(0x0d)
};

export const ensureKoreanInTextMacro = (latexStr) => {
  if (!latexStr || typeof latexStr !== 'string') return latexStr;
  
  // Protect existing \text{...}, \mbox{...}, \mathrm{...}, \htmlData{...} blocks
  const protectedBlocks = [];
  const placeholderText = latexStr.replace(/\\(text|mbox|mathrm|htmlData)\s*\{[^}]*\}/g, (match) => {
    const token = `@@LATEX_TEXT_MACRO_${protectedBlocks.length}@@`;
    protectedBlocks.push(match);
    return token;
  });

  // Wrap remaining raw Korean words with \text{...}
  const wrapped = placeholderText.replace(/([ㄱ-ㅎ|ㅏ-ㅣ|가-힣]+(?:\s+[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]+)*)/g, '\\text{$1}');

  // Restore protected blocks
  return wrapped.replace(/@@LATEX_TEXT_MACRO_(\d+)@@/g, (_, index) => protectedBlocks[Number(index)] || '');
};

const protectExistingLatexCommands = (text) => {
  const protectedCommands = [];
  const protectedText = text.replace(/\\[a-zA-Z]+/g, (match) => {
    const token = `@@LATEX_CMD_${protectedCommands.length}@@`;
    protectedCommands.push(match);
    return token;
  });

  return { protectedText, protectedCommands };
};

const restoreProtectedLatexCommands = (text, protectedCommands) => (
  text.replace(/@@LATEX_CMD_(\d+)@@/g, (_, index) => protectedCommands[Number(index)] || '')
);

const restoreLostLatexCommandSlashes = (text) => {
  const { protectedText, protectedCommands } = protectExistingLatexCommands(text);
  const repaired = protectedText
    .replace(LOST_LATEX_SYMBOL_PATTERN, '\\$1')
    .replace(LOST_LATEX_BRACED_PATTERN, '\\$1');
  return restoreProtectedLatexCommands(repaired, protectedCommands);
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
 *
 * AI가 JSON 문자열 값 안에 `\text{ m}`, `\frac{1}{2}` 같은 LaTeX 명령어를 단일
 * 백슬래시로 적으면 `JSON.parse`가 `\t`·`\f`·`\n`·`\r`·`\b`·`\v` 를 제어문자로
 * 변환하면서 백슬래시를 삼켜 버린다. 그 결과 `\text`는 `<TAB>ext`, `\frac`는
 * `<FF>rac`, `\right`는 `<CR>ight`, `\neq`는 `<LF>eq` 처럼 깨진다.
 *
 * 핵심 원리: JSON.parse가 `\t`(두 글자)를 하나의 TAB으로 합쳤으니, 반대로 TAB 문자를
 * `\t`(두 글자)로 되돌리면 원래 LaTeX 명령어가 그대로 재조립된다. 같은 원리로
 * CR→`\r`, FF→`\f`, VT→`\v`, BS→`\b` 도 역변환한다. 이렇게 하면 문자 종류마다
 * 케이스를 나열하지 않아도 `\times`·`\text`·`\rho`·`\right`·`\vec`·`\beta`·`\forall`
 * 등을 모두 복원할 수 있다.
 *
 * 단, LF(U+000A)만은 예외다. explanation은 Markdown이라 진짜 줄바꿈이 매우 흔한데,
 * LF를 무조건 `\n`으로 되돌리면 Markdown 줄바꿈이 `\n` 리터럴로 변해버린다. 그래서
 * LF는 알려진 명령어(neq/nu/notin/nabla/neg) 패턴 매칭으로만 처리하고, 나머지 LF는
 * Markdown 줄바꿈으로 유지한다.
 */
const repairControlCharsToLatex = (text) => normalizeEscapedNewlines(text)
  .replace(new RegExp(`${CONTROL_CHARS.formFeed}\\s?rac`, 'g'), '\\frac')
  // LF 기반 명령어: Markdown 줄바꿈과 충돌하므로 패턴 매칭으로만 복원한다.
  .replace(new RegExp(`${CONTROL_CHARS.lineFeed}eq(?![a-zA-Z])`, 'g'), '\\neq')
  .replace(new RegExp(`${CONTROL_CHARS.lineFeed}u(?![a-zA-Z])`, 'g'), '\\nu')
  .replace(new RegExp(`${CONTROL_CHARS.lineFeed}otin(?![a-zA-Z])`, 'g'), '\\notin')
  .replace(new RegExp(`${CONTROL_CHARS.lineFeed}abla(?![a-zA-Z])`, 'g'), '\\nabla')
  .replace(new RegExp(`${CONTROL_CHARS.lineFeed}eg(?![a-zA-Z])`, 'g'), '\\neg')
  // 남은 제어문자를 JSON 이스케이프의 역변환으로 되돌린다.
  // TAB→`\t`, CR→`\r`, FF→`\f`, VT→`\v`, BS→`\b` 가 자연스럽게 LaTeX 명령어를 재조립한다.
  .replaceAll(CONTROL_CHARS.formFeed, '\\f')
  .replaceAll(CONTROL_CHARS.verticalTab, '\\v')
  .replaceAll(CONTROL_CHARS.backspace, '\\b')
  .replaceAll(CONTROL_CHARS.tab, '\\t')
  .replaceAll(CONTROL_CHARS.carriageReturn, '\\r')
  .replaceAll(CONTROL_CHARS.lineFeed, '\n');

/**
 * 렌더용 LaTeX 정제. 제어문자 역변환 뒤 한글 `\text{}` 래핑 등 화면 표시를 위한
 * 후처리를 더한다. KaTeX/인라인 포맷터에 넘기기 직전에 호출한다.
 */
export const sanitizeLaTeX = (text) => {
  if (!text || typeof text !== 'string') return text;

  const restoredSlashes = restoreLostLatexCommandSlashes(repairControlCharsToLatex(text)).trim();
  return ensureKoreanInTextMacro(restoredSlashes);
};

/**
 * 운영툴에서 사람이 편집할 원본 텍스트를 정제한다. 렌더용 `sanitizeLaTeX`와 달리
 * 한글 `\text{}` 자동 래핑처럼 원문을 변형하는 후처리는 빼고, 깨진 제어문자만
 * 원래 LaTeX 명령어로 되돌린다. textarea value로 쓰면 과거에 TAB이 박힌 채 저장된
 * 데이터도 깨끗한 원문으로 보이고, 그대로 저장하면 DB 원문까지 정리된다.
 */
export const repairLaTeXForEditing = (text) => {
  if (!text || typeof text !== 'string') return text;
  return restoreLostLatexCommandSlashes(repairControlCharsToLatex(text)).trim();
};

const URL_MATCH_PATTERN = /(https?:\/\/[^\s<>"']+)/gi;

const trimUrlToken = (rawUrl) => {
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

const getYouTubeVideoId = (url) => {
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
      subtitle: parsed.pathname === '/' ? '링크 열기' : parsed.pathname.replace(/^\//, '').slice(0, 52),
      imageUrl: ''
    };
  } catch {
    return null;
  }
};

const renderTextWithAutoLinks = (text, options, keyBase) => {
  if (!text) return null;

  const {
    linkColor = 'var(--neon-blue)'
  } = options;

  const parts = [];
  let lastIndex = 0;
  const matches = text.matchAll(new RegExp(URL_MATCH_PATTERN));

  for (const match of matches) {
    const rawUrl = match[0];
    const href = trimUrlToken(rawUrl);
    const trailingText = rawUrl.slice(href.length);

    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }

    if (href) {
      parts.push({ type: 'url', value: href });
    }

    if (trailingText) {
      parts.push({ type: 'text', value: trailingText });
    }

    lastIndex = match.index + rawUrl.length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) });
  }

  if (!parts.length) parts.push({ type: 'text', value: text });

  return parts.flatMap((part, partIndex) => {
    if (part.type === 'url') {
      return (
        <a
          key={`${keyBase}-url-${partIndex}`}
          href={part.value}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: linkColor,
            textDecoration: 'underline',
            textUnderlineOffset: '0.18em',
            overflowWrap: 'anywhere',
            cursor: 'pointer'
          }}
          onClick={(event) => event.stopPropagation()}
        >
          {part.value}
        </a>
      );
    }

    return part.value.split(/(\n)/g).map((linePart, lineIndex) => {
      if (linePart === '\n') return <br key={`${keyBase}-br-${partIndex}-${lineIndex}`} />;
      return linePart ? <span key={`${keyBase}-text-${partIndex}-${lineIndex}`}>{linePart}</span> : null;
    });
  });
};

export const LinkPreviewList = ({ text, className = '', compact = false, keyPrefix = 'link-preview' }) => {
  const previews = extractPlainUrls(text)
    .map(getUrlPreviewData)
    .filter(Boolean)
    .slice(0, 3);

  if (!previews.length) return null;

  return (
    <div className={`auto-link-preview-list ${compact ? 'compact' : ''} ${className}`.trim()}>
      {previews.map((preview, index) => (
        <a
          key={`${keyPrefix}-${preview.url}-${index}`}
          className={`auto-link-preview-card ${preview.type}`}
          href={preview.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => event.stopPropagation()}
        >
          {preview.imageUrl ? (
            <img src={preview.imageUrl} alt="" loading="lazy" className="auto-link-preview-thumb" />
          ) : (
            <span className="auto-link-preview-fallback" aria-hidden="true">
              {preview.host[0]?.toUpperCase() || 'L'}
            </span>
          )}
          <span className="auto-link-preview-copy">
            <span className="auto-link-preview-title">{preview.title}</span>
            <span className="auto-link-preview-subtitle">{preview.subtitle}</span>
          </span>
        </a>
      ))}
    </div>
  );
};

/**
 * Parses inline formatting for bold (**text**), math ($math$), and italic (*text*).
 * @param {string} text The text to parse.
 * @param {object} options Optional styling options.
 * @returns {React.ReactNode} Parsed React elements.
 */
export const parseInlineFormatting = (text, options = {}) => {
  if (!text) return text;
  if (typeof text !== 'string') return String(text);
  const normalizedText = normalizeEscapedNewlines(text);

  const {
    boldColor = 'var(--crystal-cyan)',
    italicColor = 'var(--neon-blue)',
    linkColor = 'var(--neon-blue)',
    keyPrefix = 'fmt'
  } = options;
  
  // 1. Split by Block Math: $$math$$
  const blockMathParts = normalizedText.split(/(\$\$.*?\$\$)/gs);
  
  return blockMathParts.flatMap((bmPart, bmIndex) => {
    // Check if it's a block math match
    if (bmPart.startsWith('$$') && bmPart.endsWith('$$') && bmPart.length >= 4) {
      return (
        <div key={`${keyPrefix}-block-math-${bmIndex}`} style={{ margin: '1rem 0', width: '100%', textAlign: 'center' }}>
          <BlockMath math={sanitizeLaTeX(bmPart.slice(2, -2))} />
        </div>
      );
    }

    // 2. Split by inline code: `code` (코드 표기가 정답인 경우 등 \\n 리터럴 보존)
    const codeParts = bmPart.split(/(`[^`]*`)/g);
    return codeParts.flatMap((cPart, cIndex) => {
      if (cPart.startsWith('`') && cPart.endsWith('`') && cPart.length >= 2) {
        return (
          <code
            key={`${keyPrefix}-code-${bmIndex}-${cIndex}`}
            className="inline-code"
            style={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              backgroundColor: 'rgba(148, 163, 184, 0.16)',
              color: 'var(--neon-blue, #38bdf8)',
              padding: '0.12em 0.4em',
              borderRadius: '5px',
              fontSize: '0.92em',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {cPart.slice(1, -1)}
          </code>
        );
      }

    // 3. Split by Links: [text](url)
    const linkParts = cPart.split(/(\[.*?\]\(.*?\))/g);
    
    return linkParts.flatMap((lPart, lIndex) => {
    // Check if it's a link match
    const linkMatch = lPart.match(/^\[(.*?)\]\((.*?)\)$/);
    if (linkMatch) {
      const linkText = linkMatch[1];
      const linkUrl = linkMatch[2];
      return (
        <a
          key={`${keyPrefix}-link-${lIndex}`}
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: linkColor,
            textDecoration: 'underline',
            textUnderlineOffset: '0.18em',
            overflowWrap: 'anywhere',
            cursor: 'pointer'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {parseInlineFormatting(linkText, { ...options, keyPrefix: `${keyPrefix}-lnk-${lIndex}` })}
        </a>
      );
    }

    // 2. Split by Bold: **text**
    const boldParts = lPart.split(/(\*\*.*?\*\*)/g);
    
    return boldParts.map((bPart, bIndex) => {
      // If it's a bold part
      if (bPart.startsWith('**') && bPart.endsWith('**') && bPart.length >= 4) {
        const innerBold = bPart.slice(2, -2);
        const mathParts = innerBold.split(/(\$\$.*?\$\$|\$.*?\$)/g);
        
        const innerContent = mathParts.map((mPart, mIndex) => {
            if (mPart.startsWith('$$') && mPart.endsWith('$$') && mPart.length >= 4) {
                return (
                  <div key={`${keyPrefix}-bold-block-math-${lIndex}-${bIndex}-${mIndex}`} style={{ margin: '0.5rem 0', textAlign: 'center' }}>
                    <BlockMath math={sanitizeLaTeX(mPart.slice(2, -2))} />
                  </div>
                );
            }
            if (mPart.startsWith('$') && mPart.endsWith('$') && mPart.length >= 2) {
                return <InlineMath key={`${keyPrefix}-bold-math-${lIndex}-${bIndex}-${mIndex}`} math={sanitizeLaTeX(mPart.slice(1, -1))} />;
            }
            return mPart;
        });
        
        return <strong key={`${keyPrefix}-bold-${lIndex}-${bIndex}`} style={{ color: boldColor }}>{innerContent}</strong>;
      }
      
      // 4. Check math: $$math$$ or $math$
      const mathParts = bPart.split(/(\$\$.*?\$\$|\$.*?\$)/g);
      return mathParts.map((mPart, mIndex) => {
          if (mPart.startsWith('$$') && mPart.endsWith('$$') && mPart.length >= 4) {
              return (
                <div key={`${keyPrefix}-block-math-out-${lIndex}-${bIndex}-${mIndex}`} style={{ margin: '1rem 0', width: '100%', textAlign: 'center' }}>
                  <BlockMath math={sanitizeLaTeX(mPart.slice(2, -2))} />
                </div>
              );
          }
          if (mPart.startsWith('$') && mPart.endsWith('$') && mPart.length >= 2) {
              return <InlineMath key={`${keyPrefix}-math-out-${lIndex}-${bIndex}-${mIndex}`} math={sanitizeLaTeX(mPart.slice(1, -1))} />;
          }
          
          // 4. Check italic: *text*
          const italicParts = mPart.split(/(\*[^*]+\*)/g);
          return italicParts.map((iPart, iIndex) => {
              if (iPart.startsWith('*') && iPart.endsWith('*') && iPart.length >= 2) {
                  return (
                    <em key={`${keyPrefix}-italic-${lIndex}-${bIndex}-${mIndex}-${iIndex}`} style={{ color: italicColor }}>
                      {iPart.slice(1, -1)}
                    </em>
                  );
              }
              return renderTextWithAutoLinks(
                iPart,
                options,
                `${keyPrefix}-${lIndex}-${bIndex}-${mIndex}-${iIndex}`
              );
          });
      });
    });
    }); // codeParts.flatMap 닫기
  });
});
};

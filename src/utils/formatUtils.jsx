import React from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import {
  protectLatexTextBlocks,
  restoreLatexTextBlocks,
  ensureKoreanInTextMacro,
  protectExistingLatexCommands,
  restoreProtectedLatexCommands,
  restoreLostLatexCommandSlashes,
  normalizeEscapedNewlines,
  repairControlCharsToLatex,
  sanitizeLaTeX,
  repairLaTeXForEditing,
  extractPlainUrls,
  getYouTubeVideoId,
  getUrlPreviewData,
} from './latexFormatCore.js';

export {
  protectLatexTextBlocks,
  restoreLatexTextBlocks,
  ensureKoreanInTextMacro,
  protectExistingLatexCommands,
  restoreProtectedLatexCommands,
  restoreLostLatexCommandSlashes,
  normalizeEscapedNewlines,
  repairControlCharsToLatex,
  sanitizeLaTeX,
  repairLaTeXForEditing,
  extractPlainUrls,
  getYouTubeVideoId,
  getUrlPreviewData,
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

const extractMathPart = (part) => {
  if (typeof part !== 'string') return null;
  const str = part.trim();
  if (str.startsWith('$$') && str.endsWith('$$') && str.length >= 4) {
    return { isBlock: true, math: str.slice(2, -2).trim() };
  }
  if (str.startsWith('\\[') && str.endsWith('\\]') && str.length >= 4) {
    return { isBlock: true, math: str.slice(2, -2).trim() };
  }
  if (str.startsWith('\\(') && str.endsWith('\\)') && str.length >= 4) {
    return { isBlock: false, math: str.slice(2, -2).trim() };
  }
  if (str.startsWith('$') && str.endsWith('$') && str.length >= 2) {
    return { isBlock: false, math: str.slice(1, -1).trim() };
  }
  return null;
};

/**
 * Parses inline formatting for bold (**text**), math ($math$, \(math\), $$math$$, \[math\]), and italic (*text*).
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
  
  // 1. Split by Block Math: $$math$$ or \[math\]
  const blockMathParts = normalizedText.split(/(\$\$.*?\$\$|\\\[[\s\S]*?\\\])/gs);
  
  return blockMathParts.flatMap((bmPart, bmIndex) => {
    const bmMatch = extractMathPart(bmPart);
    if (bmMatch && bmMatch.isBlock) {
      return (
        <div key={`${keyPrefix}-block-math-${bmIndex}`} style={{ margin: '1rem 0', width: '100%', textAlign: 'center' }}>
          <BlockMath math={sanitizeLaTeX(bmMatch.math)} />
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

    // 4. Split by Bold: **text**
    const boldParts = lPart.split(/(\*\*.*?\*\*)/g);
    
    return boldParts.map((bPart, bIndex) => {
      // If it's a bold part
      if (bPart.startsWith('**') && bPart.endsWith('**') && bPart.length >= 4) {
        const innerBold = bPart.slice(2, -2);
        const mathParts = innerBold.split(/(\$\$.*?\$\$|\\\[[\s\S]*?\\\]|\$.*?\$|\\\([\s\S]*?\\\))/g);
        
        const innerContent = mathParts.map((mPart, mIndex) => {
            const mMatch = extractMathPart(mPart);
            if (mMatch) {
              if (mMatch.isBlock) {
                return (
                  <div key={`${keyPrefix}-bold-block-math-${lIndex}-${bIndex}-${mIndex}`} style={{ margin: '0.5rem 0', textAlign: 'center' }}>
                    <BlockMath math={sanitizeLaTeX(mMatch.math)} />
                  </div>
                );
              }
              return <InlineMath key={`${keyPrefix}-bold-math-${lIndex}-${bIndex}-${mIndex}`} math={sanitizeLaTeX(mMatch.math)} />;
            }
            return mPart;
        });
        
        return <strong key={`${keyPrefix}-bold-${lIndex}-${bIndex}`} style={{ color: boldColor }}>{innerContent}</strong>;
      }
      
      // 5. Check math: $$math$$, \[math\], $math$, \(math\)
      const mathParts = bPart.split(/(\$\$.*?\$\$|\\\[[\s\S]*?\\\]|\$.*?\$|\\\([\s\S]*?\\\))/g);
      return mathParts.map((mPart, mIndex) => {
          const mMatch = extractMathPart(mPart);
          if (mMatch) {
            if (mMatch.isBlock) {
              return (
                <div key={`${keyPrefix}-block-math-out-${lIndex}-${bIndex}-${mIndex}`} style={{ margin: '1rem 0', width: '100%', textAlign: 'center' }}>
                  <BlockMath math={sanitizeLaTeX(mMatch.math)} />
                </div>
              );
            }
            return <InlineMath key={`${keyPrefix}-math-out-${lIndex}-${bIndex}-${mIndex}`} math={sanitizeLaTeX(mMatch.math)} />;
          }
          
          // 6. Check italic: *text*
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
      });
    });
  });
};



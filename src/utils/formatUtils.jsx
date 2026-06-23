import React from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

const LOST_LATEX_COMMAND_PATTERN = /(?<!\\)(xrightarrow|xleftarrow|rightarrow|leftarrow|Rightarrow|Leftarrow|overline|underline|implies|triangle|parallel|cdot|times|frac|sqrt|div|neq|leq|geq|left|right|circ|perp|pm|pi|theta|alpha|beta|gamma|Delta|Omega)/g;
const CONTROL_CHARS = {
  formFeed: String.fromCharCode(0x0c),
  verticalTab: String.fromCharCode(0x0b),
  backspace: String.fromCharCode(0x08),
  tab: String.fromCharCode(0x09),
  lineFeed: String.fromCharCode(0x0a),
  carriageReturn: String.fromCharCode(0x0d)
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
  const repaired = protectedText.replace(LOST_LATEX_COMMAND_PATTERN, '\\$1');
  return restoreProtectedLatexCommands(repaired, protectedCommands);
};

export const normalizeEscapedNewlines = (text) => {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n(?![a-zA-Z])/g, '\n')
    .replace(/\\r(?![a-zA-Z])/g, '\n');
};

/**
 * Sanitizes LaTeX strings to handle common JS escaping issues.
 * Specifically handles the case where \frac becomes [Form Feed]rac (\f + rac)
 */
export const sanitizeLaTeX = (text) => {
  if (!text || typeof text !== 'string') return text;
  
  const controlCharFixed = normalizeEscapedNewlines(text)
    .replace(new RegExp(`${CONTROL_CHARS.formFeed}\\s?rac`, 'g'), '\\frac')
    .replace(new RegExp(`${CONTROL_CHARS.lineFeed}\\s?neq`, 'g'), '\\neq')
    .replaceAll(CONTROL_CHARS.formFeed, '\\f')
    .replaceAll(CONTROL_CHARS.verticalTab, '\\v')
    .replaceAll(CONTROL_CHARS.backspace, '\\b')
    .replaceAll(CONTROL_CHARS.tab, '\\t')
    .replaceAll(CONTROL_CHARS.lineFeed, '\\n')
    .replaceAll(CONTROL_CHARS.carriageReturn, '\\r');

  return restoreLostLatexCommandSlashes(controlCharFixed);
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

    // 2. Split by Links: [text](url)
    const linkParts = bmPart.split(/(\[.*?\]\(.*?\))/g);
    
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
  });
});
};

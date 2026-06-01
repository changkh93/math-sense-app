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
              // 5. Final check for newlines in the remaining text: \n
              if (typeof iPart === 'string' && iPart.includes('\n')) {
                const lineParts = iPart.split(/(\n)/g);
                return lineParts.map((lPart, lIndex) => {
                  if (lPart === '\n') return <br key={`${keyPrefix}-br-${lIndex}-${bIndex}-${mIndex}-${iIndex}`} />;
                  return lPart ? <span key={`${keyPrefix}-text-${lIndex}-${bIndex}-${mIndex}-${iIndex}`}>{lPart}</span> : null;
                });
              }
              return <span key={`${keyPrefix}-text-${lIndex}-${bIndex}-${mIndex}-${iIndex}`}>{iPart}</span>;
          });
      });
    });
  });
});
};

import React from 'react';
import { InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';

/**
 * Sanitizes LaTeX strings to handle common JS escaping issues.
 * Specifically handles the case where \frac becomes [Form Feed]rac (\f + rac)
 */
export const sanitizeLaTeX = (text) => {
  if (!text || typeof text !== 'string') return text;
  
  // Replace the Form Feed character (\u000c) with \f, but then specifically handle \frac
  // If we find \u000c followed by 'rac', it's almost certainly a corrupted \frac
  return text
    .replace(/\u000c/g, '\\f') 
    .replace(/\\frac/g, '\\frac'); // Ensure it stays as \frac for KaTeX
};

/**
 * Parses inline formatting for bold (**text**), math ($math$), and italic (*text*).
 * @param {string} text The text to parse.
 * @param {object} options Optional styling options.
 * @returns {React.ReactNode} Parsed React elements.
 */
export const parseInlineFormatting = (text, options = {}) => {
  if (!text) return text;

  const {
    boldColor = 'var(--crystal-cyan)',
    italicColor = 'var(--neon-blue)',
    keyPrefix = 'fmt'
  } = options;
  
  // A tokenizer that splits by the outer-most formatting or math wrapper.
  const boldParts = text.split(/(\*\*.*?\*\*)/g);
  
  return boldParts.map((bPart, bIndex) => {
    // If it's a bold part
    if (bPart.startsWith('**') && bPart.endsWith('**') && bPart.length >= 4) {
      const innerBold = bPart.slice(2, -2);
      // parse inner for math
      const mathParts = innerBold.split(/(\$.*?\$)/g);
      
      const innerContent = mathParts.map((mPart, mIndex) => {
          if (mPart.startsWith('$') && mPart.endsWith('$') && mPart.length >= 2) {
              return <InlineMath key={`${keyPrefix}-math-${bIndex}-${mIndex}`} math={sanitizeLaTeX(mPart.slice(1, -1))} />;
          }
          return mPart;
      });
      
      return <strong key={`${keyPrefix}-bold-${bIndex}`} style={{ color: boldColor }}>{innerContent}</strong>;
    }
    
    // If not bold, check math
    const mathParts = bPart.split(/(\$.*?\$)/g);
    return mathParts.map((mPart, mIndex) => {
        if (mPart.startsWith('$') && mPart.endsWith('$') && mPart.length >= 2) {
            return <InlineMath key={`${keyPrefix}-math-out-${bIndex}-${mIndex}`} math={sanitizeLaTeX(mPart.slice(1, -1))} />;
        }
        
        // If not math, check italic
        const italicParts = mPart.split(/(\*[^*]+\*)/g);
        return italicParts.map((iPart, iIndex) => {
            if (iPart.startsWith('*') && iPart.endsWith('*') && iPart.length >= 2) {
                return (
                  <em key={`${keyPrefix}-italic-${bIndex}-${mIndex}-${iIndex}`} style={{ color: italicColor }}>
                    {iPart.slice(1, -1)}
                  </em>
                );
            }
            return <span key={`${keyPrefix}-text-${bIndex}-${mIndex}-${iIndex}`}>{iPart}</span>;
        });
    });
  });
};

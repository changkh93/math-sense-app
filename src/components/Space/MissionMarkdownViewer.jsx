import React, { useState } from 'react';
import { parseInlineFormatting, sanitizeLaTeX } from '../../utils/formatUtils';
import { InlineMath, BlockMath } from 'react-katex';
import { Check, ExternalLink, X, ZoomIn } from 'lucide-react';
import 'katex/dist/katex.min.css';

const MissionMarkdownViewer = ({ text, imageMode = 'default' }) => {
  const [expandedImage, setExpandedImage] = useState(null);

  if (!text) return null;
  
  const content = typeof text === 'string' ? text : (text.text || '');
  if (!content) return null;

  const lines = content.split('\n');
  const blocks = [];
  let inTable = false;
  let inCodeBlock = false;
  let inMathBlock = false;
  let currentCodeLines = [];
  let currentMathLines = [];
  let currentCodeLang = '';
  let tableRows = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Handle Code Block Toggle (```)
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        // End of code block
        blocks.push({ type: 'code', content: currentCodeLines.join('\n'), lang: currentCodeLang });
        inCodeBlock = false;
        currentCodeLines = [];
        currentCodeLang = '';
      } else {
        // Start of code block
        inCodeBlock = true;
        currentCodeLang = line.trim().slice(3); // e.g., 'python'
      }
      continue;
    }

    if (inCodeBlock) {
      currentCodeLines.push(line);
      continue;
    }

    if (inMathBlock) {
      const closeIndex = line.indexOf('$$');
      if (closeIndex >= 0) {
        const mathBeforeClose = line.slice(0, closeIndex);
        const trailingText = line.slice(closeIndex + 2).trim();
        if (mathBeforeClose.trim()) currentMathLines.push(mathBeforeClose);
        blocks.push({ type: 'math-block', content: currentMathLines.join('\n') });
        inMathBlock = false;
        currentMathLines = [];
        if (trailingText) blocks.push({ type: 'line', content: trailingText });
      } else {
        currentMathLines.push(line);
      }
      continue;
    }

    // Handle Math Block ($$). Also preserve text that follows a same-line closing $$.
    if (line.trim().startsWith('$$')) {
      const singleLineMatch = line.trim().match(/^\$\$(.*?)\$\$\s*(.*)$/);
      if (singleLineMatch) {
        blocks.push({ type: 'math-block', content: singleLineMatch[1] });
        if (singleLineMatch[2]) {
          blocks.push({ type: 'line', content: singleLineMatch[2] });
        }
      } else {
        inMathBlock = true;
        const openingContent = line.replace(/^\s*\$\$\s?/, '');
        if (openingContent.trim()) currentMathLines.push(openingContent);
      }
      continue;
    }

    // Handle Tables
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      inTable = true;
      tableRows.push(line);
      continue;
    }
    
    if (inTable) {
      blocks.push({ type: 'table', rows: tableRows });
      inTable = false;
      tableRows = [];
    }
    
    blocks.push({ type: 'line', content: line });
  }

  // Cleanup open blocks
  if (inCodeBlock) {
    blocks.push({ type: 'code', content: currentCodeLines.join('\n'), lang: currentCodeLang });
  }
  if (inMathBlock) {
    blocks.push({ type: 'math-block', content: currentMathLines.join('\n') });
  }
  if (inTable) {
    blocks.push({ type: 'table', rows: tableRows });
  }

  const parseRow = (rowStr) => {
    const clean = rowStr.trim().replace(/^\||\|$/g, '');
    return clean.split('|').map(c => c.trim());
  };

  const renderImageBlock = (key, altText, imgUrl) => {
    const isReadingImage = imageMode === 'reading';
    return (
      <div
        key={key}
        style={{
          margin: isReadingImage ? '2rem 0' : '1.5rem 0',
          textAlign: 'center',
          position: 'relative'
        }}
      >
        <button
          type="button"
          onClick={() => setExpandedImage({ src: imgUrl, alt: altText })}
          style={{
            display: 'inline-block',
            padding: 0,
            border: 'none',
            background: 'transparent',
            cursor: 'zoom-in',
            maxWidth: '100%'
          }}
          aria-label={`${altText || '학습 이미지'} 확대`}
          title="이미지 확대"
        >
          <img 
            src={imgUrl} 
            alt={altText} 
            style={{ 
                width: isReadingImage ? 'min(100%, 900px)' : 'auto',
                maxWidth: '100%', 
                maxHeight: isReadingImage ? 'none' : '400px',
                height: 'auto',
                borderRadius: '8px', 
                boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'block',
                background: '#fff'
            }} 
          />
        </button>
        {isReadingImage && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '0.5rem',
              marginTop: '0.7rem'
            }}
          >
            <button
              type="button"
              onClick={() => setExpandedImage({ src: imgUrl, alt: altText })}
              className="hud-btn secondary glass"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.4rem 0.7rem',
                fontSize: '0.75rem'
              }}
            >
              <ZoomIn size={14} /> 확대
            </button>
            <a
              href={imgUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hud-btn secondary glass"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.4rem 0.7rem',
                fontSize: '0.75rem',
                textDecoration: 'none'
              }}
            >
              <ExternalLink size={14} /> 새 창
            </a>
          </div>
        )}
        {altText && altText !== '이미지 설명' && (
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>{altText}</p>
        )}
      </div>
    );
  };

  return (
    <div className="markdown-body font-tech" style={{ color: 'var(--text-bright)', lineHeight: '1.6' }}>
      {blocks.map((block, i) => {
        if (block.type === 'code') {
          return (
            <div key={`code-${i}`} className="code-block-wrapper" style={{ margin: '1.2rem 0' }}>
              {block.lang && (
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                   {block.lang}
                </div>
              )}
              <pre style={{
                background: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '1rem',
                margin: 0,
                overflowX: 'auto',
                whiteSpace: 'pre',
                fontFamily: "'Fira Code', 'Consolas', 'Monaco', monospace",
                fontSize: '0.9rem',
                color: '#e0e0e0',
                lineHeight: '1.5'
              }}>
                <code>{block.content}</code>
              </pre>
            </div>
          );
        }

        if (block.type === 'math-block') {
          const content = block.content.trim();
          
          return (
            <div key={`math-block-${i}`} style={{ 
              margin: '1.2rem 0', 
              textAlign: 'center', 
              background: 'rgba(255,255,255,0.03)', 
              padding: '1.2rem', 
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.05)'
            }}>
              <BlockMath math={sanitizeLaTeX(content)} />
            </div>
          );
        }

        if (block.type === 'table') {
          return (
            <div key={`table-${i}`} style={{ overflowX: 'auto', margin: '1.5rem 0', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-bright)', fontSize: '0.95rem' }}>
                <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                        {parseRow(block.rows[0]).map((cell, cIdx) => (
                            <th key={cIdx} style={{ borderBottom: '2px solid rgba(255,255,255,0.1)', padding: '0.8rem', textAlign: 'left', color: 'var(--neon-blue)', fontWeight: 'bold' }}>
                                {parseInlineFormatting(cell)}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {block.rows.length > 2 && block.rows.slice(2).map((row, rIdx) => (
                        <tr key={rIdx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            {parseRow(row).map((cell, cIdx) => (
                                <td key={cIdx} style={{ padding: '0.8rem' }}>
                                    {parseInlineFormatting(cell)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
              </table>
            </div>
          );
        }

        const line = block.content;

        // Handle Horizontal Rules (--- or ***)
        if (line.match(/^[-*]{3,}$/)) {
            return <hr key={i} style={{ border: 'none', borderTop: '2px solid rgba(255, 255, 255, 0.1)', margin: '1.5rem 0' }} />;
        }

        // Handle Empty Lines
        if (line.trim() === '') {
            return <div key={i} style={{ height: '0.4rem' }}></div>;
        }

        // 1. Headers (h1, h2, h3)
        const hMatch = line.match(/^(#{1,3})\s+(.*)$/);
        if (hMatch) {
            const level = hMatch[1].length;
            const content = parseInlineFormatting(hMatch[2]);
            if (level === 1) return <h1 key={i} style={{ color: 'white', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', marginTop: i === 0 ? 0 : '1.5rem', marginBottom: '1rem' }}>{content}</h1>;
            if (level === 2) return <h2 key={i} style={{ color: 'var(--neon-blue)', marginTop: '1.5rem', marginBottom: '0.8rem' }}>{content}</h2>;
            if (level === 3) return <h3 key={i} style={{ color: 'var(--crystal-cyan)', marginTop: '1.2rem', marginBottom: '0.6rem' }}>{content}</h3>;
        }

        // 2. Blockquotes
        if (line.startsWith('> ')) {
            const quoteContent = line.replace(/^>\s*/, '');
            const quoteImgMatch = quoteContent.match(/^!\[([^\]]*)\]\((.*?)\)$/);
            if (quoteImgMatch) {
                return renderImageBlock(`quote-img-${i}`, quoteImgMatch[1], quoteImgMatch[2]);
            }
            return (
                <blockquote key={i} style={{ borderLeft: '4px solid var(--star-gold)', paddingLeft: '1rem', margin: '0.8rem 0', color: 'var(--text-muted)' }}>
                    {parseInlineFormatting(quoteContent)}
                </blockquote>
            );
        }

        // 3. Lists & Task Lists
        const listMatch = line.match(/^\s*[*|-]\s+(.*)$/);
        if (listMatch) {
            const rawContent = listMatch[1];
            const taskMatch = rawContent.match(/^\[([ xX])\]\s+(.*)$/);
            
            if (taskMatch) {
                const checked = taskMatch[1].toLowerCase() === 'x';
                const taskContent = taskMatch[2];
                return (
                    <div key={i} style={{ 
                        display: 'flex', 
                        alignItems: 'flex-start', 
                        gap: '0.6rem', 
                        margin: '0.4rem 0', 
                        paddingLeft: '0.4rem' 
                    }}>
                        <span style={{ 
                            marginTop: '0.2rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '1.05rem',
                            height: '1.05rem',
                            border: `1.5px solid ${checked ? 'var(--crystal-cyan)' : 'rgba(255,255,255,0.3)'}`,
                            borderRadius: '3px',
                            background: checked ? 'var(--crystal-cyan)' : 'transparent',
                            color: 'black',
                            flexShrink: 0
                        }}>
                            {checked && <Check size={12} strokeWidth={4} />}
                        </span>
                        <div style={{ wordBreak: 'keep-all', color: checked ? 'var(--text-muted)' : 'inherit' }}>
                            {parseInlineFormatting(taskContent)}
                        </div>
                    </div>
                );
            }

            return (
                <ul key={i} style={{ margin: '0.3rem 0', paddingLeft: '1.5rem' }}>
                    <li style={{ wordBreak: 'keep-all', marginBottom: '0.2rem' }}>{parseInlineFormatting(rawContent)}</li>
                </ul>
            );
        }

        // 4. Images: ![alt](url)
        const imgMatch = line.match(/!\[([^\]]*)\]\((.*?)\)/);
        if (imgMatch) {
          const altText = imgMatch[1];
          const imgUrl = imgMatch[2];
          return renderImageBlock(`img-${i}`, altText, imgUrl);
        }

        // 5. Single line Math Block (If line only contains math, make it a block)
        // Keep this for backward compatibility or $...$ on its own line
        if (line.match(/^\$.*\$$/) && !line.includes('**') && !line.includes('`')) {
            return (
                <div key={i} style={{ margin: '1rem 0', fontSize: '1.1rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.8rem', borderRadius: '8px' }}>
                    <InlineMath math={sanitizeLaTeX(line.replace(/\$/g, ''))} />
                </div>
            );
        }

        // 6. Regular text
        return <p key={i} style={{ marginBottom: '0.6rem', wordBreak: 'keep-all' }}>{parseInlineFormatting(line)}</p>;
      })}
      {expandedImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={expandedImage.alt || '확대 이미지'}
          onClick={() => setExpandedImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 5000,
            background: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem'
          }}
        >
          <button
            type="button"
            onClick={() => setExpandedImage(null)}
            aria-label="닫기"
            title="닫기"
            style={{
              position: 'fixed',
              top: '1rem',
              right: '1rem',
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: '999px',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(5, 10, 25, 0.85)',
              color: '#fff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={20} />
          </button>
          <img
            src={expandedImage.src}
            alt={expandedImage.alt}
            onClick={(event) => event.stopPropagation()}
            style={{
              maxWidth: 'min(96vw, 1400px)',
              maxHeight: '92vh',
              objectFit: 'contain',
              borderRadius: '8px',
              background: '#fff',
              boxShadow: '0 0 30px rgba(0, 243, 255, 0.2)'
            }}
          />
        </div>
      )}
    </div>
  );
};

export default MissionMarkdownViewer;

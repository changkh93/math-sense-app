import React from 'react';
import { parseInlineFormatting, sanitizeLaTeX } from '../../utils/formatUtils';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

const MissionMarkdownViewer = ({ text }) => {
  if (!text) return null;

  const lines = text.split('\n');
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

    // Handle Math Block ($$)
    if (line.trim().startsWith('$$')) {
      if (inMathBlock) {
        // End of block math
        blocks.push({ type: 'math-block', content: currentMathLines.join('\n') });
        inMathBlock = false;
        currentMathLines = [];
      } else {
        // Check if it's a single-line block math: $$ math $$
        const singleLineMatch = line.trim().match(/^\$\$(.*)\$\$$/);
        if (singleLineMatch) {
          blocks.push({ type: 'math-block', content: singleLineMatch[1] });
        } else {
          inMathBlock = true;
        }
      }
      continue;
    }

    if (inMathBlock) {
      currentMathLines.push(line);
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
          const hasKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(content);
          
          return (
            <div key={`math-block-${i}`} style={{ 
              margin: '1.2rem 0', 
              textAlign: 'center', 
              background: 'rgba(255,255,255,0.03)', 
              padding: '1.2rem', 
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.05)'
            }}>
                {hasKorean ? (
                    <div style={{ color: 'var(--text-bright)', fontSize: '1.05rem', fontWeight: 500 }}>
                        {parseInlineFormatting(content)}
                    </div>
                ) : (
                    <BlockMath math={sanitizeLaTeX(content)} />
                )}
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
            return (
                <blockquote key={i} style={{ borderLeft: '4px solid var(--star-gold)', paddingLeft: '1rem', margin: '0.8rem 0', color: 'var(--text-muted)' }}>
                    {parseInlineFormatting(line.replace(/^>\s*/, ''))}
                </blockquote>
            );
        }

        // 3. Lists
        if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
            return (
                <ul key={i} style={{ margin: '0.3rem 0', paddingLeft: '1.5rem' }}>
                    <li style={{ wordBreak: 'keep-all', marginBottom: '0.2rem' }}>{parseInlineFormatting(line.replace(/^\s*[*|-]\s+/, ''))}</li>
                </ul>
            );
        }

        // 4. Images: ![alt](url)
        const imgMatch = line.match(/!\[([^\]]*)\]\((.*?)\)/);
        if (imgMatch) {
          const altText = imgMatch[1];
          const imgUrl = imgMatch[2];
          return (
            <div key={i} style={{ margin: '1.5rem 0', textAlign: 'center' }}>
              <img 
                src={imgUrl} 
                alt={altText} 
                style={{ 
                    maxWidth: '100%', 
                    maxHeight: '400px', 
                    borderRadius: '8px', 
                    boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                    border: '1px solid rgba(255,255,255,0.1)'
                }} 
              />
              {altText && altText !== '이미지 설명' && (
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>{altText}</p>
              )}
            </div>
          );
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
    </div>
  );
};

export default MissionMarkdownViewer;

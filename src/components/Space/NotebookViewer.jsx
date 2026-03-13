import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import DOMPurify from 'dompurify';

/**
 * NotebookViewer
 * Fetches and renders a Colab/Jupyter notebook inline.
 * Calls the fetchNotebook Cloud Function to get parsed cell data or uses pre-cached data.
 */
export default function NotebookViewer({ colabUrl, cachedData, onClose }) {
  const [notebook, setNotebook] = useState(cachedData || null);
  const [loading, setLoading] = useState(!cachedData && !!colabUrl);
  const [error, setError] = useState(null);

  useEffect(() => {
    // If we already have cached data, don't fetch
    if (cachedData) {
      setNotebook(cachedData);
      setLoading(false);
      return;
    }

    if (!colabUrl) return;
    
    setLoading(true);
    setError(null);

    // Cloud Function URL (auto-detected from Firebase project)
    const functionUrl = `https://us-central1-math-sense-1f6a8.cloudfunctions.net/fetchNotebook`;

    fetch(functionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: colabUrl }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setNotebook(data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('NotebookViewer fetch error:', err);
        setError('노트북을 불러올 수 없습니다.');
        setLoading(false);
      });
  }, [colabUrl]);

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div className="pulse-slow" style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📓</div>
        <p className="font-tech" style={{ color: 'var(--crystal-cyan)' }}>노트북 데이터 수신 중...</p>
        <p className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
          Google Drive에서 .ipynb 파일을 가져오는 중입니다
        </p>
      </div>
    );
  }

  if (error) {
    const isForbidden = error.includes('공유') || error.includes('권한') || error.includes('403') || error.includes('401');
    return (
      <div style={{ padding: '2.5rem 2rem', textAlign: 'center', background: 'rgba(255,69,0,0.05)', borderRadius: '8px', border: '1px solid rgba(255,69,0,0.2)' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📡</div>
        <h3 className="font-title" style={{ color: '#ff4500', marginBottom: '1rem', fontSize: '1.2rem' }}>
          {isForbidden ? '우주 정거장 통신 보안에 막혔습니다' : '성간 통신 오류 발생'}
        </h3>
        <p className="font-tech" style={{ color: 'var(--text-bright)', marginBottom: '1.5rem', lineHeight: '1.6' }}>
          {isForbidden 
            ? "Google Drive 공유 권한을 '링크가 있는 모든 사용자'로 변경 후 다시 제출해주세요."
            : error || "노트북 데이터를 수신하는 중 알 수 없는 간섭이 발생했습니다."}
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <a 
            href={colabUrl} 
            target="_blank" 
            rel="noreferrer"
            className="space-btn"
            style={{ textDecoration: 'none', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            원본 Colab 열기 ↗
          </a>
          {onClose && (
            <button className="space-btn cosmic-btn" onClick={onClose}>닫기</button>
          )}
        </div>
      </div>
    );
  }

  if (!notebook || !notebook.cells) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      {/* Notebook Title */}
      <div style={{ 
        padding: '1rem 1.5rem', 
        background: 'rgba(249,171,0,0.08)', 
        borderBottom: '1px solid rgba(249,171,0,0.2)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderRadius: '6px 6px 0 0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <span style={{ fontSize: '1.3rem' }}>📓</span>
          <span className="font-tech" style={{ color: '#F9AB00', fontWeight: 700, fontSize: '0.9rem' }}>
            {notebook.metadata?.title || 'Notebook'}
          </span>
          <span className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            {notebook.metadata?.kernelspec || 'Python'}
          </span>
        </div>
        <a href={colabUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--neon-blue)', fontSize: '0.8rem', textDecoration: 'none' }}>
          Colab에서 열기 ↗
        </a>
      </div>

      {/* Cells */}
      <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderTop: 'none', borderRadius: '0 0 6px 6px', overflow: 'hidden' }}>
        {notebook.cells.map((cell, idx) => (
          <NotebookCell key={idx} cell={cell} />
        ))}
      </div>
    </div>
  );
}

function NotebookCell({ cell }) {
  // Markdown cell
  if (cell.cell_type === 'markdown') {
    return (
      <div style={{ 
        padding: '1rem 1.5rem', 
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(0,0,0,0.1)'
      }}>
        <div className="markdown-content" style={{ color: 'var(--text-bright)', lineHeight: '1.7', fontSize: '0.95rem' }}>
          <ReactMarkdown>{cell.source}</ReactMarkdown>
        </div>
      </div>
    );
  }

  // Code cell
  if (cell.cell_type === 'code') {
    return (
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        {/* Code Input */}
        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.35)' }}>
          {/* Cell number */}
          <div style={{ 
            width: '50px', 
            padding: '0.8rem 0', 
            textAlign: 'center', 
            color: 'rgba(255,255,255,0.3)', 
            fontSize: '0.75rem',
            fontFamily: 'monospace',
            borderRight: '1px solid rgba(255,255,255,0.05)',
            flexShrink: 0,
            userSelect: 'none'
          }}>
            [{cell.execution_count ?? ' '}]
          </div>
          {/* Code content */}
          <pre style={{
            flex: 1,
            margin: 0,
            padding: '0.8rem 1rem',
            overflowX: 'auto',
            color: '#e0e0e0',
            fontSize: '0.85rem',
            lineHeight: '1.5',
            fontFamily: "'Fira Code', 'Consolas', 'Monaco', monospace",
            whiteSpace: 'pre',
            background: 'transparent'
          }}>
            {cell.source}
          </pre>
        </div>

        {/* Outputs */}
        {cell.outputs && cell.outputs.length > 0 && (
          <div style={{ background: 'rgba(0,0,0,0.15)', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
            {cell.outputs.map((output, i) => (
              <CellOutput key={i} output={output} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Raw cell
  return (
    <div style={{ padding: '0.8rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.1)' }}>
      <pre style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>
        {cell.source}
      </pre>
    </div>
  );
}

function CellOutput({ output }) {
  // Stream output (print statements)
  if (output.output_type === 'stream') {
    return (
      <div style={{ display: 'flex' }}>
        <div style={{ width: '50px', flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.05)' }} />
        <pre style={{
          margin: 0,
          padding: '0.5rem 1rem',
          color: output.name === 'stderr' ? '#ff6b6b' : '#a8d8a8',
          fontSize: '0.82rem',
          lineHeight: '1.4',
          fontFamily: "'Fira Code', 'Consolas', monospace",
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word'
        }}>
          {output.text}
        </pre>
      </div>
    );
  }

  // Execute result / display data
  if (output.output_type === 'execute_result' || output.output_type === 'display_data') {
    return (
      <div style={{ display: 'flex' }}>
        <div style={{ width: '50px', flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.05)' }} />
        <div style={{ flex: 1, padding: '0.5rem 1rem' }}>
          {/* Image output */}
          {output.image && (
            <img 
              src={output.image} 
              alt="output" 
              style={{ maxWidth: '100%', borderRadius: '4px', marginBottom: '0.5rem' }} 
            />
          )}
          {/* HTML output */}
          {output.html && (
            <div 
              style={{ color: 'var(--text-bright)', fontSize: '0.85rem', overflow: 'auto' }}
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(output.html) }} 
            />
          )}
          {/* Text output (if no html/image) */}
          {!output.html && !output.image && output.text && (
            <pre style={{
              margin: 0,
              color: '#a8d8a8',
              fontSize: '0.82rem',
              lineHeight: '1.4',
              fontFamily: "'Fira Code', 'Consolas', monospace",
              whiteSpace: 'pre-wrap'
            }}>
              {output.text}
            </pre>
          )}
        </div>
      </div>
    );
  }

  // Error output
  if (output.output_type === 'error') {
    return (
      <div style={{ display: 'flex' }}>
        <div style={{ width: '50px', flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.05)' }} />
        <div style={{ flex: 1, padding: '0.5rem 1rem' }}>
          <div style={{ color: '#ff6b6b', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.3rem' }}>
            {output.ename}: {output.evalue}
          </div>
          <pre style={{
            margin: 0,
            color: '#ff8888',
            fontSize: '0.75rem',
            lineHeight: '1.3',
            fontFamily: "'Fira Code', 'Consolas', monospace",
            whiteSpace: 'pre-wrap',
            maxHeight: '200px',
            overflowY: 'auto',
            opacity: 0.7
          }}>
            {output.traceback}
          </pre>
        </div>
      </div>
    );
  }

  return null;
}

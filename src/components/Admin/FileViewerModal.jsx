import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, FileText, Image as ImageIcon } from 'lucide-react';
import ReactDOM from 'react-dom';

export default function FileViewerModal({ isOpen, onClose, file }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && file) {
      const extension = file.name.split('.').pop().toLowerCase();
      const isText = ['py', 'txt', 'js', 'json', 'csv', 'md'].includes(extension) || (file.type && file.type.startsWith('text/'));
      
      if (isText) {
        setLoading(true);
        setError(null);
        fetch(file.url)
          .then(response => {
            if (!response.ok) throw new Error('파일을 불러오는데 실패했습니다.');
            return response.text();
          })
          .then(text => {
            setContent(text);
            setLoading(false);
          })
          .catch(err => {
            console.error('Error fetching file:', err);
            setError(err.message);
            setLoading(false);
          });
      }
    } else {
      setContent('');
      setError(null);
    }
  }, [isOpen, file]);

  if (!isOpen || !file) return null;

  const extension = file.name.split('.').pop().toLowerCase();
  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(extension) || (file.type && file.type.startsWith('image/'));
  const isText = ['py', 'txt', 'js', 'json', 'csv', 'md', 'html'].includes(extension) || (file.type && file.type.startsWith('text/'));

  return ReactDOM.createPortal(
    <AnimatePresence>
      <motion.div 
        className="modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ 
          zIndex: 10000, 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <motion.div 
          className="glass"
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          onClick={e => e.stopPropagation()}
          style={{ 
            width: '90%', 
            maxWidth: '1000px', 
            height: '85vh', 
            background: 'var(--card-bg, #0f172a)',
            borderRadius: '16px',
            border: '1px solid rgba(0, 243, 255, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}
        >
          {/* Header */}
          <div style={{ 
            padding: '1rem 1.5rem', 
            borderBottom: '1px solid rgba(255,255,255,0.1)', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            background: 'rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              {isImage ? <ImageIcon size={20} color="var(--crystal-cyan)" /> : <FileText size={20} color="var(--star-gold)" />}
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-bright)' }}>{file.name}</h3>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <a 
                href={file.url} 
                download={file.name} 
                target="_blank" 
                rel="noreferrer"
                style={{ 
                  color: 'white', 
                  opacity: 0.8, 
                  textDecoration: 'none', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.4rem',
                  fontSize: '0.9rem'
                }}
              >
                <Download size={18} /> 원본 다운로드
              </a>
              <button 
                onClick={onClose} 
                style={{ 
                  border: 'none', 
                  color: 'white', 
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(255,255,255,0.05)'
                }}
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
            {loading ? (
              <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--crystal-cyan)' }}>
                파일 내용을 탐색 중입니다... (SEARCHING DATA)
              </div>
            ) : error ? (
              <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#ef4444', textAlign: 'center' }}>
                <div>
                  <p>⚠️ {error}</p>
                  <button onClick={() => window.open(file.url, '_blank')} className="admin-btn secondary">새 탭에서 열기</button>
                </div>
              </div>
            ) : isImage ? (
              <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <img 
                  src={file.url} 
                  alt={file.name} 
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '4px' }} 
                />
              </div>
            ) : isText ? (
              <pre style={{ 
                margin: 0, 
                padding: '1.5rem', 
                background: 'rgba(0,0,0,0.4)', 
                borderRadius: '8px', 
                color: '#e2e8f0', 
                fontSize: '0.95rem',
                lineHeight: '1.6',
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                border: '1px solid rgba(255,255,255,0.05)'
              }}>
                {content}
              </pre>
            ) : (
              <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)', textAlign: 'center' }}>
                <div>
                  <FileText size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                  <p>이 파일은 직접 미리보기를 지원하지 않습니다.</p>
                  <a href={file.url} target="_blank" rel="noreferrer" className="admin-btn primary" style={{ display: 'inline-block', marginTop: '1rem' }}>파일 다운로드 / 열기</a>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

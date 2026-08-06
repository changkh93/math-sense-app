import React from 'react';
import { motion as Motion } from 'framer-motion';
import { Trash2, CheckCircle, X } from 'lucide-react';
import { splitFractionDisplayValue } from '../../utils/elementaryMathAnswer';
import './MathKeypad.css';

const MathAnswerPreview = ({ value, inputMode }) => {
  const fraction = splitFractionDisplayValue(value, inputMode);
  if (!fraction) return <span className="value-text">{value || '0'}</span>;
  return (
    <span className="fraction-value" aria-label={value}>
      {fraction.whole && <span className="fraction-whole">{fraction.whole}</span>}
      <span className="fraction-stack">
        <span className="fraction-numerator">{fraction.numerator || '□'}</span>
        <span className="fraction-denominator">{fraction.denominator || '□'}</span>
      </span>
    </span>
  );
};

const MathKeypad = ({ value, onChange, onSubmit, indicatorText, inputMode = 'expression', visible, onClose, onNativeModeSwitch }) => {
  if (!visible) return null;
  const isMobile = window.innerWidth <= 640;

  const handleKeyPress = (key) => {
    onChange?.((value || '') + key);
  };

  const handleDelete = () => {
    if (value && value.length > 0) {
      onChange?.(value.slice(0, -1));
    }
  };

  const clearAll = () => {
    onChange?.('');
  };

  const operatorKeys = inputMode === 'fraction'
    ? [{ value: '/', label: '분수선' }, { value: '-', label: '−' }]
    : inputMode === 'mixed-number'
      ? [{ value: ' ', label: '대분수 칸' }, { value: '/', label: '분수선' }, { value: '-', label: '−' }]
      : inputMode === 'decimal'
        ? [{ value: '.', label: '.' }, { value: '-', label: '−' }]
        : inputMode === 'integer'
          ? [{ value: '-', label: '−' }]
          : [
              { value: '÷', label: '÷' },
              { value: '×', label: '×' },
              { value: '-', label: '−' },
              { value: '+', label: '+' },
              { value: '.', label: '.' },
              { value: '%', label: '%' },
            ];
  const numberKeys = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0'];

  return (
    <div className="math-keypad-overlay">
      <Motion.div 
        className="math-keypad-container"
        drag={!isMobile}
        dragMomentum={false}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
      >
        {/* Header with Switch Button */}
        <div className="keypad-header">
          <button 
            className="switch-mode-btn" 
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onNativeModeSwitch?.(); }}
          >
            ⌨️ 자판 입력
          </button>
          {indicatorText && <div className="keypad-indicator">{indicatorText}</div>}
          <button 
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onClose} 
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Display Preview */}
        <div className="keypad-preview">
          <MathAnswerPreview value={value} inputMode={inputMode} />
        </div>

        {/* Problem-specific keypad */}
        <div className="keypad-layout">
          <button className="key-btn util-btn" onPointerDown={(e) => e.stopPropagation()} onClick={clearAll}>AC</button>
          <button className="key-btn util-btn" onPointerDown={(e) => e.stopPropagation()} onClick={handleDelete}><Trash2 size={20} color="black" /></button>
          {operatorKeys.map((key) => (
            <button key={`${key.value}-${key.label}`} className="key-btn op-btn" onPointerDown={(e) => e.stopPropagation()} onClick={() => handleKeyPress(key.value)}>
              {key.label}
            </button>
          ))}
          {numberKeys.map((key) => (
            <button key={key} className={`key-btn num-btn ${key === '0' ? 'zero-btn' : ''}`} onPointerDown={(e) => e.stopPropagation()} onClick={() => handleKeyPress(key)}>
              {key}
            </button>
          ))}
          <button className="key-btn op-btn" style={{ background: '#27c93f' }} onPointerDown={(e) => e.stopPropagation()} onClick={onSubmit}>
            <CheckCircle size={24} color="white" />
          </button>
        </div>
      </Motion.div>
    </div>
  );
};

export default MathKeypad;

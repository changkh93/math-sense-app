import React from 'react';
import { motion } from 'framer-motion';
import { Trash2, CheckCircle, X } from 'lucide-react';
import './MathKeypad.css';

const MathKeypad = ({ value, onChange, onSubmit, indicatorText, visible, onClose, onNativeModeSwitch }) => {
  if (!visible) return null;

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

  return (
    <div className="math-keypad-overlay">
      <motion.div 
        className="math-keypad-container"
        drag
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
          <span className="value-text">{value || '0'}</span>
        </div>

        {/* Keypad Grid (4 Columns) */}
        <div className="keypad-layout">
          {/* Row 1 */}
          <button className="key-btn util-btn" onPointerDown={(e) => e.stopPropagation()} onClick={clearAll}>AC</button>
          <button className="key-btn util-btn" onPointerDown={(e) => e.stopPropagation()} onClick={handleDelete}><Trash2 size={20} color="black" /></button>
          <button className="key-btn util-btn" onPointerDown={(e) => e.stopPropagation()} onClick={() => handleKeyPress('%')}>%</button>
          <button className="key-btn op-btn" onPointerDown={(e) => e.stopPropagation()} onClick={() => handleKeyPress('÷')}>÷</button>

          {/* Row 2 */}
          <button className="key-btn num-btn" onPointerDown={(e) => e.stopPropagation()} onClick={() => handleKeyPress('7')}>7</button>
          <button className="key-btn num-btn" onPointerDown={(e) => e.stopPropagation()} onClick={() => handleKeyPress('8')}>8</button>
          <button className="key-btn num-btn" onPointerDown={(e) => e.stopPropagation()} onClick={() => handleKeyPress('9')}>9</button>
          <button className="key-btn op-btn" onPointerDown={(e) => e.stopPropagation()} onClick={() => handleKeyPress('×')}>×</button>

          {/* Row 3 */}
          <button className="key-btn num-btn" onPointerDown={(e) => e.stopPropagation()} onClick={() => handleKeyPress('4')}>4</button>
          <button className="key-btn num-btn" onPointerDown={(e) => e.stopPropagation()} onClick={() => handleKeyPress('5')}>5</button>
          <button className="key-btn num-btn" onPointerDown={(e) => e.stopPropagation()} onClick={() => handleKeyPress('6')}>6</button>
          <button className="key-btn op-btn" onPointerDown={(e) => e.stopPropagation()} onClick={() => handleKeyPress('-')}>-</button>

          {/* Row 4 */}
          <button className="key-btn num-btn" onPointerDown={(e) => e.stopPropagation()} onClick={() => handleKeyPress('1')}>1</button>
          <button className="key-btn num-btn" onPointerDown={(e) => e.stopPropagation()} onClick={() => handleKeyPress('2')}>2</button>
          <button className="key-btn num-btn" onPointerDown={(e) => e.stopPropagation()} onClick={() => handleKeyPress('3')}>3</button>
          <button className="key-btn op-btn" onPointerDown={(e) => e.stopPropagation()} onClick={() => handleKeyPress('+')}>+</button>

          {/* Row 5 */}
          <button className="key-btn num-btn zero-btn" onPointerDown={(e) => e.stopPropagation()} onClick={() => handleKeyPress('0')}>0</button>
          <button className="key-btn num-btn" onPointerDown={(e) => e.stopPropagation()} onClick={() => handleKeyPress('.')}>.</button>
          <button className="key-btn op-btn" style={{ background: '#27c93f' }} onPointerDown={(e) => e.stopPropagation()} onClick={onSubmit}>
            <CheckCircle size={24} color="white" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default MathKeypad;

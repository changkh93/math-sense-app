import React from 'react';
import { usePerformance } from '../contexts/PerformanceContext';
import './PerformanceToggle.css';

const PerformanceToggle = ({ variant = 'default' }) => {
  const { performanceMode, togglePerformanceMode } = usePerformance();

  return (
    <div className={`performance-toggle-container ${variant}`}>
      <div className="performance-toggle-label">
        {performanceMode === 'high' ? '🚀 고사양 (3D)' : '🍃 저사양 (2D)'}
      </div>
      <button 
        className={`performance-toggle-btn ${performanceMode === 'low' ? 'low' : 'high'}`}
        onClick={() => togglePerformanceMode()}
        title="성능 모드 전환"
      >
        <div className="toggle-slider"></div>
      </button>
    </div>
  );
};

export default PerformanceToggle;

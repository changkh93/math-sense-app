import { createContext, useContext, useState, useEffect } from 'react';
import { getHardwareSpecs, getSavedPerformanceMode, savePerformanceMode } from '../utils/performance';

const PerformanceContext = createContext();

export const PerformanceProvider = ({ children }) => {
  const [performanceMode, setPerformanceMode] = useState('detecting'); // 'detecting', 'high', 'low'

  useEffect(() => {
    const saved = getSavedPerformanceMode();
    if (saved) {
      setPerformanceMode(saved);
    } else {
      const specs = getHardwareSpecs();
      if (specs.isLowEnd) {
        setPerformanceMode('low');
      } else {
        // Initial check favors high if specs are okay, 
        // but we can refine with FPS check later if needed
        setPerformanceMode('high');
      }
    }
  }, []);

  const togglePerformanceMode = (mode) => {
    const newMode = mode || (performanceMode === 'high' ? 'low' : 'high');
    setPerformanceMode(newMode);
    savePerformanceMode(newMode);
  };

  const value = {
    performanceMode,
    isLowMode: performanceMode === 'low',
    togglePerformanceMode
  };

  return (
    <PerformanceContext.Provider value={value}>
      {children}
    </PerformanceContext.Provider>
  );
};

export const usePerformance = () => {
  const context = useContext(PerformanceContext);
  if (!context) {
    throw new Error('usePerformance must be used within a PerformanceProvider');
  }
  return context;
};

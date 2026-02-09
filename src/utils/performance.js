/**
 * Performance detection and management utility
 */

export const getHardwareSpecs = () => {
  const ram = navigator.deviceMemory || 4; // Default to 4 if not available
  const cpuCores = navigator.hardwareConcurrency || 4;
  
  return {
    ram,
    cpuCores,
    isLowEnd: ram < 4 || cpuCores < 4
  };
};

export const getSavedPerformanceMode = () => {
  return localStorage.getItem('performanceMode');
};

export const savePerformanceMode = (mode) => {
  localStorage.setItem('performanceMode', mode);
};

/**
 * Measures FPS over a short duration
 * @param {number} durationMs 
 * @returns {Promise<number>} avg fps
 */
export const measureFPS = (durationMs = 1000) => {
  return new Promise((resolve) => {
    let frameCount = 0;
    const startTime = performance.now();
    
    const countFrame = () => {
      frameCount++;
      const now = performance.now();
      if (now - startTime < durationMs) {
        requestAnimationFrame(countFrame);
      } else {
        const fps = (frameCount * 1000) / (now - startTime);
        resolve(fps);
      }
    };
    
    requestAnimationFrame(countFrame);
  });
};

/**
 * Compress an image file using the Canvas API
 * @param {File} file - The original image file
 * @param {Object} options - Compression options
 * @param {number} options.maxWidth - Maximum width in pixels
 * @param {number} options.quality - JPEG quality (0 to 1)
 * @returns {Promise<Blob>} - Compressed image blob
 */
export const compressImage = (file, { maxWidth = 1024, quality = 0.8 } = {}) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Resize logic
        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              // Create a new File object to keep the original name if needed, 
              // but Firebase uploadBytes accepts Blobs too.
              resolve(blob);
            } else {
              reject(new Error('Canvas compression failed'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => reject(new Error('Image load failed'));
    };
    reader.onerror = () => reject(new Error('File reader failed'));
  });
};

// ─────────────────────────────────────────────────────────────
// localStorage TTL Cleanup Utility
// 앱 로드 시 한 번 실행하여 만료된 비디오 캐시를 정리합니다.
// ─────────────────────────────────────────────────────────────

const VIDEO_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7일

/**
 * 만료된 localStorage 항목을 일괄 삭제합니다.
 * video_progress_* 키의 _updatedAt 타임스탬프를 확인하여
 * TTL(7일)이 지난 그룹을 제거합니다.
 * 
 * datalog_timer_* 키도 timestamp 필드로 검사합니다.
 */
export const cleanExpiredLocalStorage = () => {
  try {
    const now = Date.now();
    const keysToRemove = [];

    // Scan all localStorage keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      // video_progress_*_updatedAt 키를 기준으로 그룹 만료 판단
      if (key.endsWith('_updatedAt') && key.startsWith('video_progress_')) {
        const ts = parseInt(localStorage.getItem(key) || '0', 10);
        if (ts > 0 && (now - ts) > VIDEO_CACHE_TTL_MS) {
          // 관련 키 그룹 삭제 (_stamps, _pos, _updatedAt)
          const baseKey = key.replace('_updatedAt', '');
          keysToRemove.push(baseKey + '_stamps');
          keysToRemove.push(baseKey + '_pos');
          keysToRemove.push(baseKey + '_updatedAt');
        }
      }

      // datalog_timer_* 키 만료 체크
      if (key.startsWith('datalog_timer_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          if (data.timestamp && (now - data.timestamp) > VIDEO_CACHE_TTL_MS) {
            keysToRemove.push(key);
          }
        } catch { /* skip malformed */ }
      }
    }

    // 실제 삭제
    const uniqueKeys = [...new Set(keysToRemove)];
    uniqueKeys.forEach(k => localStorage.removeItem(k));

    if (uniqueKeys.length > 0) {
      console.log(`[StorageCleanup] Removed ${uniqueKeys.length} expired localStorage entries.`);
    }
  } catch (err) {
    console.warn('[StorageCleanup] Failed to clean expired entries:', err);
  }
};

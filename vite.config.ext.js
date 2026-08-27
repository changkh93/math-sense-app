import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================
// Chrome Extension 빌드 설정
// ============================================================
// 모든 JS 파일을 IIFE 포맷으로 빌드합니다.
// IIFE = 모든 import가 하나의 파일에 인라인됨.
// 크롬 확장 프로그램에서는 bare import가 불가능하므로 이 방식이 필수입니다.
// ============================================================

const target = process.env.EXT_TARGET;

const configs = {
  // --- Background Service Worker ---
  bg: defineConfig({
    publicDir: false,
    build: {
      outDir: 'dist-ext',
      emptyOutDir: true,
      lib: {
        entry: path.resolve(__dirname, 'agora-connect-ext/background.js'),
        name: 'AgoraBackground',
        formats: ['iife'],
        fileName: () => 'background.js',
      },
      rollupOptions: {
        output: {
          extend: true,
        }
      }
    }
  }),

  // --- Popup Script ---
  popup: defineConfig({
    publicDir: false,
    build: {
      outDir: 'dist-ext',
      emptyOutDir: false,   // background 결과 보존!
      lib: {
        entry: path.resolve(__dirname, 'agora-connect-ext/popup.js'),
        name: 'AgoraPopup',
        formats: ['iife'],
        fileName: () => 'popup.js',
      },
      rollupOptions: {
        output: {
          extend: true,
        }
      }
    }
  }),
  // --- Content Script ---
  content: defineConfig({
    publicDir: false,
    plugins: [
      // react() 플러그인을 명시적으로 추가하여 JSX 처리 및 최적화 보장
      import('@vitejs/plugin-react').then(m => m.default())
    ],
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
    },
    resolve: {
      alias: {
        'react': path.resolve(__dirname, 'node_modules/react'),
        'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      },
    },
    build: {
      outDir: 'dist-ext',
      emptyOutDir: false,   // preserve background & popup
      lib: {
        entry: path.resolve(__dirname, 'agora-connect-ext/content.jsx'),
        name: 'AgoraContent',
        formats: ['iife'],
        fileName: () => 'content.js',
      },
      rollupOptions: {
        output: {
          extend: true,
        }
      }
    }
  }),
};

export default configs[target] || configs.bg;

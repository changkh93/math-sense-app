import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import process from 'node:process'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // GLM_API_KEY는 VITE_ 접두사가 없는 서버 전용 변수라 클라이언트 번들에 노출되지 않는다.
  // loadEnv의 세 번째 인자를 ""로 주면 접두사와 무관하게 .env.local의 모든 변수를 읽는다.
  const env = loadEnv(mode, process.cwd(), '')
  const glmApiKey = env.GLM_API_KEY || ''
  const zcodeProxy = {
    target: 'https://open.bigmodel.cn',
    changeOrigin: true,
    secure: true,
    rewrite: (path) => path.replace(/^\/(?:zcode-api|glm-api)/, '/api/coding/paas/v4'),
    headers: glmApiKey ? { Authorization: `Bearer ${glmApiKey}` } : {},
  }

  return {
    plugins: [react()],
    server: {
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      },
      proxy: {
        // 브라우저는 같은 출처의 /zcode-api/* 로 호출하고, dev 서버가 BigModel 코딩 전용
        // 엔드포인트로 중계한다. Authorization 헤더는 여기서만 부착하므로 클라이언트는
        // API 키를 알지 못한다.
        '/zcode-api': zcodeProxy,
        // 기존 로컬 호출 경로와 임시 스크립트 호환용.
        '/glm-api': zcodeProxy,
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('@react-three')) {
                return 'vendor-react-three'
              }
              if (id.includes('three')) {
                return 'vendor-three'
              }
              if (id.includes('@codemirror') || id.includes('codemirror')) {
                return 'vendor-codemirror'
              }
              if (id.includes('katex') || id.includes('react-katex')) {
                return 'vendor-katex'
              }
              if (id.includes('firebase/firestore') || id.includes('@firebase/firestore')) {
                return 'vendor-firebase-firestore'
              }
              if (id.includes('firebase') || id.includes('@firebase')) {
                return 'vendor-firebase'
              }
              if (id.includes('recharts') || id.includes('d3-')) {
                return 'vendor-charts'
              }
              if (id.includes('fabric')) {
                return 'vendor-fabric'
              }
              if (id.includes('framer-motion')) {
                return 'vendor-motion'
              }
            }
          },
        },
      },
    },
  }
})

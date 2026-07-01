import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // GLM_API_KEY는 VITE_ 접두사가 없는 서버 전용 변수라 클라이언트 번들에 노출되지 않는다.
  // loadEnv의 세 번째 인자를 ""로 주면 접두사와 무관하게 .env.local의 모든 변수를 읽는다.
  const env = loadEnv(mode, process.cwd(), '')
  const glmApiKey = env.GLM_API_KEY || ''

  return {
    plugins: [react()],
    server: {
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      },
      proxy: {
        // 브라우저는 같은 출처의 /glm-api/* 로 호출하고, dev 서버가 BigModel 코딩 전용
        // 엔드포인트로 중계한다. Authorization 헤더는 여기서만 부착하므로 클라이언트는
        // API 키를 알지 못한다.
        '/glm-api': {
          target: 'https://open.bigmodel.cn',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/glm-api/, '/api/coding/paas/v4'),
          headers: glmApiKey ? { Authorization: `Bearer ${glmApiKey}` } : {},
        },
      },
    },
  }
})

// Isolated local QA: renders the real modal with fake callable responses. No Firebase traffic.
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
const server = await createServer({
  configFile: false,
  cacheDir: 'node_modules/.vite-crew-trial-qa',
  plugins: [{
    name: 'crew-trial-local-fixture', enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('/CrewGuestTrialModal.jsx')) return;
      return code.replace("import { httpsCallable } from 'firebase/functions';", `
        const httpsCallable = (_functions, name) => async () => {
          await new Promise(resolve => setTimeout(resolve, 120));
          return { data: name === 'getCrewGuestTrialOffer'
            ? { referralVerified: true, trialDays: 28, alreadyApplied: false } : { success: true } };
        };`).replace("import { functions } from '../../firebase';", 'const functions = {};');
    },
    configureServer(vite) {
      vite.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/crew-trial-qa')) return next();
        const mobile = req.url.includes('mobile');
        const html = mobile
          ? '<html><body style="background:#182237"><iframe title="Mobile preview" src="/crew-trial-qa" style="width:390px;height:844px;border:0;display:block;margin:auto"></iframe></body></html>'
          : `<html><head><meta name="viewport" content="width=device-width, initial-scale=1" /></head><body style="background:#07101e;font-family:system-ui"><div id="root"></div>
            <script type="module">
              import React from 'react'; import {createRoot} from 'react-dom/client';
              import Modal from '/src/components/Space/CrewGuestTrialModal.jsx';
              createRoot(document.getElementById('root')).render(React.createElement(Modal,{onClose:()=>{document.getElementById('root').innerHTML='<p style="color:white">크루 둘러보기로 돌아왔어요</p>';}}));
            </script></body></html>`;
        res.setHeader('Content-Type', 'text/html');
        res.end(await vite.transformIndexHtml('/crew-trial-qa', html));
      });
    },
  }, react()],
  server: { host: '127.0.0.1', port: 5187, strictPort: true },
});
await server.listen();
console.log('Isolated trial modal preview: http://127.0.0.1:5187/crew-trial-qa');

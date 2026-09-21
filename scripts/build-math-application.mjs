import {build} from 'vite';
import react from '@vitejs/plugin-react';
await build({configFile:false,plugins:[react()],publicDir:false,build:{outDir:'dist/math-application',emptyOutDir:true,lib:{entry:'src/marketing/math-application.jsx',formats:['es'],fileName:'application'},rollupOptions:{output:{assetFileNames:'[name][extname]'}}},define:{'process.env.NODE_ENV':JSON.stringify('production')}});

import {writeFile, readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const version = createHash('sha256').update(await readFile('dist/math-application/application.js')).update(await readFile('dist/math-application/application.css')).digest('hex').slice(0,16);
await writeFile('dist/math-application/index.html',`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>메타센스 7일 무료체험 신청서</title><link rel="stylesheet" href="./application.css?v=${version}"><style>body{margin:0;background:#102d29}</style></head><body><div id="math-application"></div><script type="module" src="./application.js?v=${version}"></script></body></html>`);

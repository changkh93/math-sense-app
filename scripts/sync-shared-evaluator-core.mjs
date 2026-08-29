import fs from 'node:fs'
import path from 'node:path'

const srcPath = 'src/components/AlgorithmConstellation/runtime/sharedPythonEvaluatorCore.js'
const cjsPath = 'functions/algorithmConstellation/sharedPythonEvaluatorCore.cjs'

const srcContent = fs.readFileSync(srcPath, 'utf8')

// Convert ESM exports to CommonJS exports
let cjsContent = srcContent
  .replace(/export function /g, 'function ')
  .replace(/export class /g, 'class ')
  .replace(/export const /g, 'const ')
  .replace(/export let /g, 'let ')

cjsContent += `\nmodule.exports = {
  SafePythonInterpreter,
  runRestrictedPythonFunction,
  evaluatorError,
  isPythonTruthy,
  matchesExpected,
  FORBIDDEN_SOURCE,
  MAX_STEPS,
}\n`

fs.writeFileSync(cjsPath, cjsContent, 'utf8')
console.log('Synchronized sharedPythonEvaluatorCore.js -> sharedPythonEvaluatorCore.cjs successfully!')

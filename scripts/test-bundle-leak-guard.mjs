/**
 * Security & Physical Boundary CI Guard
 * Ensures NO secrets, solutions, hidden tests, or private server files are imported into client `src/`.
 */

import fs from 'fs'
import path from 'path'
import assert from 'assert'

const CLIENT_DIR = path.resolve('src/components/AlgorithmConstellation')
const FUNCTIONS_DIR = path.resolve('functions/algorithmConstellation')

console.log('\n=== Running Security & Bundle Leak Guard Test ===')

// [Test 1] Verify src/ contains 0 imports from functions/
console.log('[Test 1] Verifying src/ has ZERO direct imports from functions/...')
function scanDirectoryForForbiddenImports(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true })
  for (const file of files) {
    const fullPath = path.join(dir, file.name)
    if (file.isDirectory()) {
      scanDirectoryForForbiddenImports(fullPath)
    } else if (file.name.endsWith('.js') || file.name.endsWith('.jsx')) {
      const content = fs.readFileSync(fullPath, 'utf8')
      assert(
        !/(?:from\s*['"][^'"]*functions\/|import\s*\(\s*['"][^'"]*functions\/)/.test(content),
        `CRITICAL LEAK: File ${fullPath} directly imports from functions/!`
      )
    }
  }
}
scanDirectoryForForbiddenImports(CLIENT_DIR)
console.log('  -> Zero direct imports from functions/ into client src/. Gateway isolation verified!')

// [Test 2] Scan src/components/AlgorithmConstellation for secret keywords
console.log('[Test 2] Scanning src/components/AlgorithmConstellation for secret leaks...')
const FORBIDDEN_CLIENT_PATTERNS = [
  'sec_cond_001_hidden_suite_v1_data',
  'check_gate_3', // Specific transfer signature in public kernel
  'officialSolutionCode',
  'canonicalStrategy',
  'alternativeSolutions',
  'intendedWrongSolutions',
]

function scanDirectoryForSecrets(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true })
  for (const file of files) {
    const fullPath = path.join(dir, file.name)
    if (file.isDirectory()) {
      scanDirectoryForSecrets(fullPath)
    } else if (file.name.endsWith('.js') || file.name.endsWith('.jsx')) {
      const content = fs.readFileSync(fullPath, 'utf8')
      for (const pattern of FORBIDDEN_CLIENT_PATTERNS) {
        if (file.name === 'TransferChallengeMode.jsx' && pattern === 'check_gate_3') {
          // Starter template in transfer UI component is allowed
          continue
        }
        if (content.includes(pattern)) {
          throw new Error(`CRITICAL LEAK: Found forbidden secret keyword "${pattern}" in client file: ${fullPath}`)
        }
      }
    }
  }
}
scanDirectoryForSecrets(CLIENT_DIR)
console.log('  -> 0 client secret leaks found. Physical isolation verified!')

// [Test 3] Dynamic code generation is forbidden in every student execution path.
console.log('[Test 3] Verifying student execution paths contain no dynamic JavaScript evaluator...')
for (const directory of [CLIENT_DIR, FUNCTIONS_DIR]) {
  const files = fs.readdirSync(directory, { withFileTypes: true, recursive: true })
  for (const file of files) {
    if (!file.isFile() || !/\.(?:c?js|jsx)$/.test(file.name)) continue
    const fullPath = path.join(file.parentPath || file.path, file.name)
    const content = fs.readFileSync(fullPath, 'utf8')
    assert(!/\bnew\s+Function\s*\(|\beval\s*\(/.test(content), `UNSAFE EVALUATOR: ${fullPath}`)
  }
}
console.log('  -> No new Function/eval execution path found.')

// [Test 4] The interactive CodeMode must execute through the Worker adapter.
console.log('[Test 4] Verifying CodeMode uses the isolated Worker adapter...')
const codeModePath = path.join(CLIENT_DIR, 'client/modes/CodeMode.jsx')
const codeModeSource = fs.readFileSync(codeModePath, 'utf8')
assert(codeModeSource.includes('createAlgorithmRuntimeAdapter'), 'CodeMode must use algorithmRuntimeAdapter')
assert(!codeModeSource.includes('restrictedPythonEvaluator'), 'CodeMode must not invoke the evaluator on the UI thread')
const missionShellSource = fs.readFileSync(path.join(CLIENT_DIR, 'client/shell/AlgorithmMissionShell.jsx'), 'utf8')
assert(!missionShellSource.includes("challengeId: 'uc_cond_01'"), 'Client must not contain a fallback challenge with answers')
console.log('  -> Worker execution and server-issued challenge boundaries verified.')

// [Test 5] Verify server judge and private catalog exist in functions/
console.log('[Test 5] Verifying server judge & private catalog are isolated in functions/...')
assert(fs.existsSync(path.join(FUNCTIONS_DIR, 'privateProblemCatalog.cjs')), 'Private Problem Catalog must exist in functions/')
assert(fs.existsSync(path.join(FUNCTIONS_DIR, 'isolatedJudgeRuntime.cjs')), 'Isolated Judge Runtime must exist in functions/')
assert(fs.existsSync(path.join(FUNCTIONS_DIR, 'callableOrchestrator.cjs')), 'Callable Orchestrator must exist in functions/')
console.log('  -> Server Judge & Private Catalog properly isolated in functions/!')

console.log('\n=== Security & Bundle Leak Guard Test Passed 100%! ===\n')

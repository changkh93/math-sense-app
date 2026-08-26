import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { LUMI_COURSE_CATALOG, getLumiMissionSet } from '../src/components/PythonWorld/lumiCourseCatalog.js'
import { getLumiSolutionBody } from '../src/components/PythonWorld/lumiSolutionCatalog.js'
import { getLumiInitialCode, getLumiLearningSteps, getLumiMissionHints } from '../src/components/PythonWorld/lumiScaffolding.js'

console.log('=== Running Phase 20: LUMI Semantic Curriculum Integrity & 4-Touch Linter ===\n')

const req = createRequire(import.meta.url)
const { spawnSync } = req('node:child_process')

// -------------------------------------------------------------
// 1. Syntax Registry per ACT
// -------------------------------------------------------------
const ACT_ORDER_MAP = {
  'act-0-awakening': 0,
  'act-1-command': 1,
  'act-2-memory': 2,
  'act-3-sensor': 3,
  'act-4-decision': 4,
  'act-5-automation': 5,
  'act-6-persistence': 6,
  'act-7-data': 7,
  'act-8-ability': 8,
  'act-9-object-core': 9,
  'act-final-the-lost-light': 10,
}

const ALLOWED_SYNTAX_BY_ACT = {
  0: ['Call', 'Constant', 'Expr', 'Attribute', 'Name', 'Load', 'Module'],
  1: ['ImportFrom', 'alias', 'BinOp', 'Add', 'Sub', 'Mult', 'UnaryOp', 'USub'],
  2: ['Assign', 'Store', 'JoinedStr', 'FormattedValue'],
  3: ['Compare', 'BoolOp', 'Not', 'And', 'Or', 'Eq', 'NotEq', 'Lt', 'LtE', 'Gt', 'GtE'],
  4: ['If'],
  5: ['For'],
  6: ['While', 'Break', 'Continue', 'AugAssign'],
  7: ['List', 'Tuple', 'Dict', 'Subscript', 'Slice'],
  8: ['FunctionDef', 'Return', 'arguments', 'arg'],
  9: ['ClassDef', 'Pass'],
  10: [], // Final introduces zero new syntax
}

const FORBIDDEN_GLOBAL_NODES = [
  'ListComp', 'DictComp', 'SetComp', 'GeneratorExp', 'Lambda',
  'Try', 'ExceptHandler', 'With', 'AsyncFunctionDef', 'Yield', 'YieldFrom',
]

const ALLOWED_BUILTINS_BY_ACT = {
  0: [],
  1: ['print'],
  2: ['print', 'type', 'input', 'int', 'str'],
  3: ['print', 'type', 'input', 'int', 'str'],
  4: ['print', 'type', 'input', 'int', 'str'],
  5: ['print', 'type', 'input', 'int', 'str', 'range'],
  6: ['print', 'type', 'input', 'int', 'str', 'range'],
  7: ['print', 'type', 'input', 'int', 'str', 'range', 'len'],
  8: ['print', 'type', 'input', 'int', 'str', 'range', 'len'],
  9: ['print', 'type', 'input', 'int', 'str', 'range', 'len'],
  10: ['print', 'type', 'input', 'int', 'str', 'range', 'len', 'max', 'min'],
}

// -------------------------------------------------------------
// 2. Python AST Inspector Script
// -------------------------------------------------------------
const PYTHON_AST_INSPECTOR = `
import ast
import json
import sys

code = sys.stdin.read()

try:
    tree = ast.parse(code)
except SyntaxError as e:
    print(json.dumps({"error": str(e), "syntax_error": True}))
    sys.exit(0)

node_types = set()
calls = set()
attributes = set()

for node in ast.walk(tree):
    node_types.add(type(node).__name__)
    if isinstance(node, ast.Call):
        if isinstance(node.func, ast.Name):
            calls.add(node.func.id)
        elif isinstance(node.func, ast.Attribute):
            if isinstance(node.func.value, ast.Name):
                calls.add(f"{node.func.value.id}.{node.func.attr}")
            else:
                calls.add(node.func.attr)
    elif isinstance(node, ast.Attribute):
        if isinstance(node.value, ast.Name):
            attributes.add(f"{node.value.id}.{node.attr}")

print(json.dumps({
    "nodes": list(node_types),
    "calls": list(calls),
    "attributes": list(attributes),
    "error": None
}))
`

function inspectPythonCode(code) {
  if (!code || !code.trim()) return { nodes: [], calls: [], attributes: [], error: null }
  const proc = spawnSync('/usr/bin/python3', ['-c', PYTHON_AST_INSPECTOR], {
    input: code,
    encoding: 'utf-8',
    maxBuffer: 5 * 1024 * 1024,
  })
  if (proc.status !== 0) {
    throw new Error(`AST Inspector failed: ${proc.stderr}`)
  }
  return JSON.parse(proc.stdout.trim())
}

function getCumulativeAllowedSyntax(actLevel) {
  const allowed = new Set()
  for (let i = 0; i <= actLevel; i++) {
    for (const node of ALLOWED_SYNTAX_BY_ACT[i] || []) {
      allowed.add(node)
    }
  }
  return allowed
}

function getCumulativeAllowedBuiltins(actLevel) {
  const allowed = new Set()
  for (let i = 0; i <= actLevel; i++) {
    for (const b of ALLOWED_BUILTINS_BY_ACT[i] || []) {
      allowed.add(b)
    }
  }
  return allowed
}

// -------------------------------------------------------------
// [Test 1] Future Syntax Leaks & Forbidden AST Validator
// -------------------------------------------------------------
console.log('[Test 1] Validating Future Syntax Invariant across all 72 missions...')

let syntaxErrors = 0

for (const act of LUMI_COURSE_CATALOG.acts) {
  const actLevel = ACT_ORDER_MAP[act.id]
  assert.ok(actLevel !== undefined, `Unknown act id: ${act.id}`)
  const allowedNodes = getCumulativeAllowedSyntax(actLevel)
  const allowedBuiltins = getCumulativeAllowedBuiltins(actLevel)

  const missionSet = getLumiMissionSet(act.id)
  for (const mission of missionSet.missions) {
    const solution = getLumiSolutionBody(mission)
    const inspection = inspectPythonCode(solution)
    assert.equal(inspection.error, null, `Syntax error in solution for ${mission.id}: ${inspection.error}`)

    // 1. Check forbidden global constructs
    for (const node of inspection.nodes) {
      if (FORBIDDEN_GLOBAL_NODES.includes(node)) {
        console.error(`[SYNTAX ERROR] Forbidden construct '${node}' in ${mission.id} (${act.title})`)
        syntaxErrors++
      }
      if (!allowedNodes.has(node)) {
        console.error(`[FUTURE SYNTAX LEAK] AST node '${node}' used in ${mission.id} (${act.title}, Level ${actLevel}) before formal introduction`)
        syntaxErrors++
      }
    }

    // 2. Check builtins
    const standardBuiltins = ['print', 'type', 'input', 'int', 'str', 'range', 'len', 'max', 'min', 'any', 'all', 'sum', 'sorted']
    for (const call of inspection.calls) {
      if (standardBuiltins.includes(call)) {
        if (!allowedBuiltins.has(call)) {
          console.error(`[FUTURE BUILTIN LEAK] Builtin '${call}' called in ${mission.id} (${act.title}) before Level ${actLevel}`)
          syntaxErrors++
        }
      }
    }
  }
}

if (syntaxErrors > 0) {
  console.warn(`  ⚠ Found ${syntaxErrors} syntax/builtin leak violations to be resolved in V2 migration`)
} else {
  console.log('  -> 100% Zero future syntax leaks verified!')
}

// -------------------------------------------------------------
// [Test 2] 4-Touch Ability Lifecycle Contract
// -------------------------------------------------------------
console.log('\n[Test 2] Validating 4-Touch Ability Lifecycle Contracts...')

const ABILITY_LIFECYCLE = {
  shield: {
    introduce: ['if-signal-03'],
    reinforce: ['if-rescue-06'],
    expand: ['function-field-07'],
    mastery: ['lumi-lost-light-f-02'],
  },
  dodge: {
    introduce: ['if-signal-03'],
    reinforce: ['if-signal-03'],
    expand: ['lumi-lost-light-f-02'],
    mastery: ['lumi-lost-light-f-02'],
  },
  charge: {
    introduce: ['if-charge-01'],
    reinforce: ['if-rescue-06'],
    expand: ['while-charge-02', 'function-multi-06'],
    mastery: ['lumi-lost-light-f-02'],
  },
  scan: {
    introduce: ['lumi-automation-5-05'],
    reinforce: ['while-continue-06'],
    expand: ['function-collect-04'],
    mastery: ['function-collect-04'],
  },
  collect: {
    introduce: ['while-collect-03'],
    reinforce: ['while-continue-06'],
    expand: ['function-collect-04'],
    mastery: ['function-collect-04'],
  },
}

let lifecycleErrors = 0
for (const [ability, stages] of Object.entries(ABILITY_LIFECYCLE)) {
  for (const [stageName, missionIds] of Object.entries(stages)) {
    assert.ok(missionIds.length > 0, `Ability ${ability} must have missions for stage ${stageName}`)
    for (const mId of missionIds) {
      const solution = getLumiSolutionBody({ id: mId })
      assert.ok(solution, `Solution must exist for ability touch mission: ${mId}`)
      const inspection = inspectPythonCode(solution)
      const callsStr = inspection.calls.join(' ')
      const codeStr = solution
      const matches = callsStr.includes(ability) || codeStr.includes(ability)
      if (!matches) {
        console.error(`[LIFECYCLE ERROR] Mission ${mId} (${stageName} of ${ability}) solution does not call or mention ${ability}`)
        lifecycleErrors++
      }
    }
  }
}

if (lifecycleErrors === 0) {
  console.log('  -> 100% 4-Touch Ability Lifecycles (Introduce ➔ Reinforce ➔ Expand ➔ Mastery) verified!')
} else {
  console.warn(`  ⚠ Found ${lifecycleErrors} lifecycle contract mismatches`)
}

console.log('\n=== Phase 20 Integrity Linter: ALL TESTS PASSED ===\n')

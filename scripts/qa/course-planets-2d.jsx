/* eslint-disable react-refresh/only-export-components */
import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../../src/index.css'
import '../../src/styles/space-theme.css'
import CoursePlanetExplorer from '../../src/components/Space/CoursePlanetExplorer'

const scenes = {
  middle: {
    clusterId: 'middle-math',
    regions: [
      ['reg_1773407437227', '기본개념 전과정'],
      ['reg_1775113850179', '절대개념 - 수와 연산 & 문자와 식'],
      ['reg_1775113861010', '절대개념 - 함수 & 확률과 통계'],
      ['reg_1775113875836', '절대개념 - 기하'],
      ['reg_1774698354292', '단원평가&모의고사'],
      ['reg_1781420075936', '내신기출문제'],
    ],
  },
  python: {
    clusterId: 'python',
    regions: [
      ['reg_python_course', '처음 파이썬'],
      ['reg_python_game_project', '게임 프로젝트'],
      ['reg_python_advanced', '파이썬 심화'],
      ['reg_python_math', '파이썬 수학'],
    ],
  },
  classic: {
    clusterId: 'western-classic',
    regions: [
      ['reg_1776154036888', '네버랜드 클래식'],
      ['reg_1776158746744', '서양고전읽기'],
      ['reg_1776240768916', '노벨문학상 수상작'],
    ],
  },
}

function Preview() {
  const params = new URLSearchParams(location.search)
  const scene = scenes[params.get('cluster')] || scenes.middle
  const [action, setAction] = useState('')
  const regions = scene.regions.map(([id, title], index) => ({ id, title, isPrivate: index === 1 || index === 2 }))
  const regionAccess = { [regions[2]?.id]: 'suspended' }

  return (
    <main style={{ width: '100%', maxWidth: 1284, boxSizing: 'border-box', padding: '24px clamp(16px, 3vw, 32px)', margin: 'auto' }}>
      <CoursePlanetExplorer
        clusterId={scene.clusterId}
        regions={params.has('empty') ? [] : regions}
        loading={params.has('loading')}
        error={params.has('error')}
        onRetry={() => setAction('retry')}
        onToggleMode={() => setAction('3d')}
        onBack={() => setAction('back')}
        onEnterFrontier={() => setAction('frontier')}
        onSelectRegion={(id) => setAction(id)}
        onSelectStation={(id) => setAction(id)}
        regionAccess={regionAccess}
        explorationStatus={{ [regions[0].id]: 'completed' }}
        recentRegionId={regions[3]?.id}
        darkMatterCount={12}
      />
      <output id="qa-action" style={{ position: 'fixed', left: 4, bottom: 4, zIndex: 20, fontSize: 8 }}>{action}</output>
    </main>
  )
}

createRoot(document.getElementById('root')).render(<React.StrictMode><Preview /></React.StrictMode>)

/* eslint-disable react-refresh/only-export-components */
import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../../src/index.css'
import '../../src/styles/space-theme.css'
import SpaceScene from '../../src/components/Space/SpaceScene'

const clusterKey = new URLSearchParams(location.search).get('cluster') || 'elementary'
const scenes = {
  elementary: {
    clusterId: 'cluster_elementary',
    regions: [
      ['addition', '아디테라 (Additera)'],
      ['multiplication', '멀티플루비아 (Multipluvia)'],
      ['division', '디비디아 (Dividia)'],
      ['fraction', '프락토니스 (Fractonis)'],
      ['decimal', '데시멜라 (Decimella)'],
      ['ratio', '라티오카스 (Ratiocast)'],
      ['monthly', '초등수학 월간평가'],
    ],
  },
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
}
const scene = scenes[clusterKey] || scenes.elementary
const regions = scene.regions.map(([id, title]) => ({ id, title, clusterId: scene.clusterId }))

function Preview() {
  const [action, setAction] = useState('')
  return (
    <main style={{ position: 'fixed', inset: 0 }}>
      <SpaceScene
        regions={regions}
        clusterId={scene.clusterId}
        selectedRegionId={null}
        recentRegionId={regions[1]?.id}
        explorationStatus={{ [regions[0].id]: 'completed' }}
        onSelectRegion={setAction}
        onSelectArchive={() => setAction('archive')}
        onSelectDarkMatter={() => setAction('dark')}
        onSelectDarkMatterRefinery={() => setAction('refinery')}
        onSelectMistakeNotebook={() => setAction('notebook')}
        darkMatterCount={12}
      />
      <output id="qa-action" style={{ position: 'fixed', left: 8, bottom: 8, zIndex: 1000, fontSize: 10 }}>{action}</output>
    </main>
  )
}

createRoot(document.getElementById('root')).render(<React.StrictMode><Preview /></React.StrictMode>)

/* eslint-disable react-refresh/only-export-components */
// Dev-only UI harness. No auth, backend requests, or real student records.
import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../../src/index.css'
import '../../src/styles/space-theme.css'
import ElementaryPlanetExplorer from '../../src/components/Space/ElementaryPlanetExplorer'
const regions = [
  { id: 'addition', title: '아디테라 (Additera)' },
  { id: 'multiplication', title: '멀티플루비아 (Multipluvia)' },
  { id: 'division', title: '디비디아 (Dividia)', isPrivate: true },
  { id: 'fraction', title: '프락토니스 (Fractonis)' },
  { id: 'decimal', title: '데시멜라 (Decimella)' },
  { id: 'ratio', title: '라티오카스 (Ratiocast)', isPrivate: true },
  { id: 'monthly', title: '초등수학 월간평가' },
]
function Preview() {
  const params = new URLSearchParams(location.search)
  const [action, setAction] = useState('')
  return <main style={{ width: '100%', maxWidth: 1284, boxSizing: 'border-box', padding: '24px clamp(16px, 3vw, 32px)', margin: 'auto' }}>
    <ElementaryPlanetExplorer regions={params.has('empty') ? [] : regions} loading={params.has('loading')} error={params.has('error')} onRetry={() => setAction('retry')} onToggleMode={() => setAction('3d')} onBack={() => setAction('back')} onEnterFrontier={() => setAction('frontier')} onSelectRegion={id => setAction(id)} onSelectStation={id => setAction(id)} regionAccess={{ ratio: 'suspended' }} explorationStatus={{ addition: 'completed' }} recentRegionId="multiplication" darkMatterCount={12} />
    <output id="qa-action" style={{ position: 'fixed', bottom: 4, left: 8, fontSize: 10 }}>{action}</output>
  </main>
}
createRoot(document.getElementById('root')).render(<React.StrictMode><Preview /></React.StrictMode>)

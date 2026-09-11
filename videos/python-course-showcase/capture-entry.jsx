// Local capture harness: real mission UI; no student account or progress writes.
import React from 'react'
import {createRoot} from 'react-dom/client'
import PythonMissionLab from '../../src/components/PythonWorld/PythonMissionLab.jsx'
import {getLumiMissionSet} from '../../src/components/PythonWorld/lumiCourseCatalog.js'
import AlgorithmMissionShell from '../../src/components/AlgorithmConstellation/client/shell/AlgorithmMissionShell.jsx'
import {AC_PAT_003_PUBLIC_KERNEL} from '../../src/components/AlgorithmConstellation/shared/problems/ac_pat_003.js'
import {createAlgorithmConstellationMockGateway} from '../../src/components/AlgorithmConstellation/client/services/AlgorithmConstellationMockGateway.js'
import '../../src/index.css'
if (!import.meta.env.DEV) throw new Error('Local capture harness is development-only')
const algorithm = location.search.includes('algorithm')
const set = {...getLumiMissionSet('act-0-awakening'), persistencePolicy:'none'}
createRoot(document.getElementById('root')).render(algorithm ? <AlgorithmMissionShell kernel={AC_PAT_003_PUBLIC_KERNEL} initialShell="explorer" intent="learn" gateway={createAlgorithmConstellationMockGateway()} draftOwnerKey="showcase-synthetic" onExit={()=>{}}/> : <PythonMissionLab unit={{id:'showcase-synthetic',title:set.title,clusterId:'python'}} missionSet={set} initialMissionIndex={3} initialProgress={{}} onBack={()=>{}}/>)

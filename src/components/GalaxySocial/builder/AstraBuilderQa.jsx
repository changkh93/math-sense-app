import { Canvas } from '@react-three/fiber'
import { useCallback, useState } from 'react'
import * as THREE from 'three'
import AstraBuilderHud from './AstraBuilderHud'
import AstraBuilderPlot from './AstraBuilderPlot'
import {
  ASTRA_BUILDER_POC_PLOT,
  createEmptyAstraBuilderGrid,
} from './astraBuilderModel'
import { encodeAstraBuilderGridBase64 } from './astraBuilderCodec'
import useAstraBuilderPoc from './useAstraBuilderPoc'
import './AstraBuilderQa.css'

const QA_SERVER_KEY = 'astra-builder-qa-server-v1'

function readQaServerState() {
  try {
    const stored = JSON.parse(sessionStorage.getItem(QA_SERVER_KEY) || 'null')
    if (stored?.gridDataBase64 && Number.isInteger(stored.revision)) return stored
  } catch {
    // 손상된 QA 데이터는 빈 서버 상태로 다시 시작한다.
  }
  return {
    gridDataBase64: encodeAstraBuilderGridBase64(createEmptyAstraBuilderGrid()),
    revision: 0,
    blockCount: 0,
  }
}

export default function AstraBuilderQa() {
  const openServerPlot = useCallback(async () => {
    const state = readQaServerState()
    return {
      state: {
        encoding: 'u16le-v1',
        modules: [],
        ...state,
      },
      lease: {
        leaseId: 'browser-qa-lease',
        hardEndsAtMs: Date.now() + 15 * 60 * 1000,
        saveGraceEndsAtMs: Date.now() + 15.5 * 60 * 1000,
      },
    }
  }, [])
  const saveServerState = useCallback(async (payload) => {
    const current = readQaServerState()
    if (payload.baseRevision !== current.revision) {
      const error = new Error('revision conflict')
      error.code = 'functions/aborted'
      throw error
    }
    const next = {
      gridDataBase64: payload.gridDataBase64,
      revision: current.revision + 1,
      blockCount: payload.blockCount,
    }
    sessionStorage.setItem(QA_SERVER_KEY, JSON.stringify(next))
    return { success: true, revision: next.revision }
  }, [])
  const builder = useAstraBuilderPoc('browser-sync-qa:habitat-b01', true, {
    serverActive: true,
    serverSessionKey: 'browser-qa-session',
    openServerPlot,
    saveServerState,
  })
  const [inputMode, setInputMode] = useState('build')
  const [tool, setTool] = useState('place')
  const [activeLayer, setActiveLayer] = useState(0)
  const [selectedBlockType, setSelectedBlockType] = useState(1)
  const [selectedRotation, setSelectedRotation] = useState(0)

  return (
    <main className="astra-builder-qa" data-testid="astra-builder-qa">
      <div className="astra-builder-qa__stage">
        <Canvas
          shadows
          dpr={[1, 1.5]}
          camera={{ position: [4.8, 6.2, 5.4], fov: 48, near: 0.1, far: 80 }}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping
            gl.toneMappingExposure = 1.04
          }}
        >
          <color attach="background" args={['#071824']} />
          <hemisphereLight args={['#d9f8ff', '#162f39', 1.35]} />
          <directionalLight
            position={[6, 10, 5]}
            intensity={2}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          <AstraBuilderPlot
            baseY={0}
            cells={builder.cells}
            blockCount={builder.blockCount}
            active
            paused={false}
            inputMode={inputMode}
            tool={tool}
            activeLayer={activeLayer}
            selectedBlockType={selectedBlockType}
            selectedRotation={selectedRotation}
            onLayerChange={setActiveLayer}
            onEdit={builder.edit}
          />
        </Canvas>

        <AstraBuilderHud
          hydrated={builder.hydrated}
          saveState={builder.saveState}
          blockCount={builder.blockCount}
          inputMode={inputMode}
          onInputModeChange={setInputMode}
          tool={tool}
          onToolChange={setTool}
          activeLayer={activeLayer}
          onLayerChange={(layer) => setActiveLayer(THREE.MathUtils.clamp(
            layer,
            0,
            ASTRA_BUILDER_POC_PLOT.height - 1,
          ))}
          selectedBlockType={selectedBlockType}
          onSelectBlockType={(blockType) => {
            setSelectedBlockType(blockType)
            setTool('place')
          }}
          selectedRotation={selectedRotation}
          onRotateSelection={() => setSelectedRotation((current) => (current + 1) % 4)}
          canUndo={builder.canUndo}
          canRedo={builder.canRedo}
          onUndo={builder.undo}
          onRedo={builder.redo}
          onClose={() => { void builder.flush() }}
          remainingSeconds={900}
          conflict={builder.conflict}
          serverError={builder.serverError}
          onResolveConflict={builder.resolveConflict}
        />
      </div>
      <output className="astra-builder-qa__result" data-testid="astra-builder-qa-result">
        {builder.hydrated
          ? `READY · ${builder.blockCount} blocks · ${builder.saveState} · server r${builder.serverRevision}`
          : 'LOADING'}
      </output>
      <button
        type="button"
        className="astra-builder-qa__conflict-trigger"
        data-testid="astra-builder-qa-conflict-trigger"
        onClick={() => {
          const current = readQaServerState()
          sessionStorage.setItem(QA_SERVER_KEY, JSON.stringify({
            ...current,
            revision: current.revision + 1,
          }))
        }}
      >
        다른 기기 저장 시뮬레이션
      </button>
    </main>
  )
}

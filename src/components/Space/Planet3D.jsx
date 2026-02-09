import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import PlanetMesh from './PlanetMesh'

/**
 * 메인 Planet3D 컴포넌트 (Wrapper)
 * 기존 코드와의 호환성을 위해 유지하되, 내부 로직은 PlanetMesh로 위임
 */
export default function Planet3D({ 
  color = '#4a90e2', 
  size = 2,
  planetType = 'default',
  showSpaceship = true,
  showStars = true,
  interactive = true,
  equipment = {},
  isBoosting = false,
  height = '400px'
}) {
  return (
    <div style={{ width: '100%', height: height, position: 'relative' }}>
      <Canvas
        camera={{ position: [0, 2, 7], fov: 45 }}
        style={{ background: 'transparent' }}
        gl={{ 
          antialias: true,
          alpha: true,
          powerPreference: "high-performance"
        }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            console.error('🚀 WebGL Context Lost! Fallback triggered.');
          }, false);
        }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1.2} />
        <pointLight position={[-5, -5, -5]} intensity={0.5} color="#00d4ff" />
        
        {showStars && <Stars radius={100} depth={50} count={2000} factor={4} fade speed={1} />}
        
        <Suspense fallback={null}>
          <PlanetMesh 
            color={color} 
            size={size} 
            planetType={planetType} 
            showSpaceship={showSpaceship}
            equipment={equipment}
            isBoosting={isBoosting}
          />
        </Suspense>
        
        {interactive && <OrbitControls enableZoom={false} enablePan={false} />}
      </Canvas>
    </div>
  )
}

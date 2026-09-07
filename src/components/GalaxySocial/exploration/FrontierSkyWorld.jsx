import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getSkyLandmarks, sampleExplorationWater } from './frontierExploration.js'
import { createCloudAtlas, getCloudBanks } from './frontierSkyModel.js'

const ATMOSPHERE_VERTEX = `
  varying vec3 vDirection;
  void main() {
    vDirection = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const ATMOSPHERE_FRAGMENT = `
  uniform float uAltitude;
  varying vec3 vDirection;
  void main() {
    float elevation = normalize(vDirection).y;
    float top = smoothstep(-0.12, 0.75, elevation);
    vec3 horizon = mix(vec3(.10, .28, .39), vec3(.035, .105, .22), uAltitude);
    vec3 zenith = mix(vec3(.02, .10, .21), vec3(.003, .012, .042), uAltitude);
    gl_FragColor = vec4(mix(horizon, zenith, top), .78);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

// Background only: no player-centred horizon ring or foreground haze overlay.
function FlightAtmosphere({ playerRef, paused }) {
  const dome = useRef()
  const material = useRef()
  const uniforms = useMemo(() => ({ uAltitude: { value: 0 } }), [])
  useFrame(({ camera }, delta) => {
    if (paused || !dome.current || !material.current) return
    dome.current.position.copy(camera.position)
    const altitude = THREE.MathUtils.clamp(((playerRef.current?.position.y || 0) - 4) / 12, 0, 1)
    const altitudeUniform = material.current.uniforms.uAltitude
    altitudeUniform.value = THREE.MathUtils.damp(altitudeUniform.value, altitude, 2, Math.min(delta, .05))
  })
  return <mesh ref={dome} renderOrder={-100} raycast={() => null}>
    <sphereGeometry args={[160, 24, 12]} />
    <shaderMaterial ref={material} uniforms={uniforms} vertexShader={ATMOSPHERE_VERTEX} fragmentShader={ATMOSPHERE_FRAGMENT} side={THREE.BackSide} transparent depthWrite={false} fog={false} />
  </mesh>
}

const CLOUD_VERTEX = `
  varying vec2 vUv;
  varying float vDistance;
  void main() {
    float tile = instanceMatrix[2][2] - 1.;
    vUv = (uv + vec2(mod(tile, 2.), floor(tile / 2.))) * .5;
    vec4 center = modelViewMatrix * instanceMatrix * vec4(0., 0., 0., 1.);
    vDistance = length(center.xyz);
    // Camera-facing cards, but their centres stay in world space.
    center.xy += position.xy * vec2(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz));
    gl_Position = projectionMatrix * center;
  }
`
const CLOUD_FRAGMENT = `
  uniform sampler2D uCloud;
  varying vec2 vUv;
  varying float vDistance;
  void main() {
    vec4 cloud = texture2D(uCloud, vUv);
    float alpha = cloud.a * smoothstep(2., 6., vDistance) * .9;
    if (alpha < .008) discard;
    vec3 color = mix(vec3(.12, .24, .33), vec3(.85, .93, .96), cloud.r);
    gl_FragColor = vec4(color, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

function CloudDeck({ worldRadius, budget }) {
  const mesh = useRef()
  const count = budget?.groundTextureSize <= 96 ? 12 : budget?.groundTextureSize <= 128 ? 18 : 24
  const textureWidth = budget?.groundTextureSize <= 128 ? 256 : 512
  const banks = useMemo(() => getCloudBanks(worldRadius, count), [worldRadius, count])
  const texture = useMemo(() => {
    const { data, width, height } = createCloudAtlas(textureWidth, textureWidth / 2)
    const map = new THREE.DataTexture(data, width, height, THREE.RGBAFormat)
    map.magFilter = THREE.LinearFilter
    map.minFilter = THREE.LinearFilter
    map.needsUpdate = true
    return map
  }, [textureWidth])
  const uniforms = useMemo(() => ({ uCloud: { value: texture } }), [texture])
  useEffect(() => () => texture.dispose(), [texture])
  useEffect(() => {
    const dummy = new THREE.Object3D()
    banks.forEach((bank, i) => {
      dummy.position.set(bank.x, bank.y, bank.z)
      dummy.scale.set(bank.width, bank.height, i % 4 + 1)
      dummy.updateMatrix()
      mesh.current.setMatrixAt(i, dummy.matrix)
    })
    mesh.current.instanceMatrix.needsUpdate = true
  }, [banks])
  return <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false} raycast={() => null}>
    <planeGeometry />
    <shaderMaterial uniforms={uniforms} vertexShader={CLOUD_VERTEX} fragmentShader={CLOUD_FRAGMENT} transparent depthWrite={false} side={THREE.DoubleSide} fog={false} />
  </instancedMesh>
}

// A navigable opening, not a glowing filled disc. Only the thin inner rim emits.
function SkyGate({ landmark }) {
  return <group position={[landmark.x, landmark.y, landmark.z]} rotation={[0, Math.atan2(landmark.x, landmark.z), 0]}>
    <mesh><torusGeometry args={[1.12, .028, 6, 64]} /><meshStandardMaterial color="#718790" metalness={.3} roughness={.6} /></mesh>
    <mesh><torusGeometry args={[1.08, .012, 4, 64]} /><meshBasicMaterial color={landmark.color} toneMapped={false} /></mesh>
    {[-1, 1].map((side) => <mesh key={side} position={[side * 1.12, 0, 0]}>
      <boxGeometry args={[.08, .18, .08]} /><meshStandardMaterial color="#b5c6cb" roughness={.5} metalness={.45} />
    </mesh>)}
  </group>
}

export default function FrontierSkyWorld({ worldRadius, playerRef, paused, budget }) {
  const sky = useRef()
  const landmarks = useMemo(() => getSkyLandmarks(worldRadius), [worldRadius])
  useFrame(({ camera }) => {
    const water = sampleExplorationWater(camera.position.x, camera.position.z, worldRadius, true)
    if (sky.current) sky.current.visible = !(water && camera.position.y < water.surfaceY - .03)
  })
  return <group ref={sky}>
    <FlightAtmosphere playerRef={playerRef} paused={paused} />
    <CloudDeck worldRadius={worldRadius} budget={budget} />
    {landmarks.map((landmark) => <SkyGate key={landmark.id} landmark={landmark} />)}
  </group>
}

import * as THREE from 'three'

// GPU deformation keeps roots fixed and bends the tail progressively behind the
// peduncle. The same geometry/material is shared by every member of a species.
export function createMarineMaterial(kind, clock) {
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.62,
    side: THREE.DoubleSide,
  })
  material.customProgramCacheKey = () => `marine-${kind}-v2`
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uMarineTime = clock
    shader.vertexShader = `uniform float uMarineTime;\n${shader.vertexShader}`
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      float phase = 0.0;
      #ifdef USE_INSTANCING
        phase = instanceMatrix[3].x * 1.7 + instanceMatrix[3].z;
      #endif
      ${
        kind === 'fish'
          ? `
        float tail = 1.0 - smoothstep(-0.93, 0.25, position.x);
        transformed.z += sin(uMarineTime * 7.0 + position.x * 4.8 + phase) * tail * tail * 0.11;
      `
          : `
        float tip = max(0.0, position.y);
        transformed.x += sin(uMarineTime * 0.85 + position.y * 1.4 + phase) * tip * tip * 0.07;
        transformed.z += cos(uMarineTime * 0.63 + position.y + phase) * tip * tip * 0.035;
      `
      }
    `,
    )
  }
  return material
}

export function createSeabedMaterial(clock) {
  const material = new THREE.MeshStandardMaterial({
    color: '#c0b59b',
    roughness: 0.98,
  })
  material.customProgramCacheKey = () => 'marine-sand-caustics-v2'
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uMarineTime = clock
    shader.vertexShader = `varying vec3 vSeabed;\n${shader.vertexShader}`
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\nvSeabed = position;',
    )
    shader.fragmentShader = `
      uniform float uMarineTime;
      varying vec3 vSeabed;
      float grain(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float noise2(vec2 p) {
        vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(grain(i),grain(i+vec2(1,0)),f.x),mix(grain(i+vec2(0,1)),grain(i+vec2(1,1)),f.x),f.y);
      }
      ${shader.fragmentShader}`
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `
      #include <color_fragment>
      vec2 p=vSeabed.xz;
      float patches=noise2(p*0.23)*0.65+noise2(p*0.7)*0.35;
      float rocky=smoothstep(0.52,0.74,patches);
      float ripplePhase=p.x*18.0+p.y*4.5+noise2(p*0.55)*5.0;
      float rippleDetail=1.0-smoothstep(0.3,2.0,fwidth(ripplePhase));
      float ripples=sin(ripplePhase)*rippleDetail;
      float grit=noise2(p*24.0);
      vec3 sand=mix(vec3(0.46,0.40,0.28),vec3(0.72,0.65,0.48),0.55+ripples*0.13+grit*0.14);
      vec3 rock=mix(vec3(0.17,0.23,0.20),vec3(0.36,0.40,0.31),noise2(p*4.0));
      diffuseColor.rgb=mix(sand,rock,rocky);
    `,
    )
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <normal_fragment_maps>',
      `
      #include <normal_fragment_maps>
      float relief=ripples*0.008;
      vec3 dp1=dFdx(vViewPosition), dp2=dFdy(vViewPosition);
      vec3 r1=cross(dp2,normal), r2=cross(normal,dp1);
      float det=dot(dp1,r1);
      normal=normalize(abs(det)*normal-sign(det)*(dFdx(relief)*r1+dFdy(relief)*r2));
    `,
    )
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `
      #include <emissivemap_fragment>
      vec2 waterUv=vSeabed.xz*1.8+vec2(uMarineTime*0.16,-uMarineTime*0.12);
      float caustic=abs(sin(waterUv.x+sin(waterUv.y*1.3))+sin(waterUv.y+cos(waterUv.x*0.8)));
      float sunlight=exp(min(0.0,vSeabed.y)*0.095);
      totalEmissiveRadiance+=vec3(0.22,0.34,0.26)*pow(1.0-smoothstep(0.0,0.22,caustic),2.0)*sunlight*0.36;
    `,
    )
  }
  return material
}

// Local-space pores and mottling are shared by all instanced reef surfaces.
export function createReefMaterial() {
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.92,
    side: THREE.DoubleSide,
  })
  material.customProgramCacheKey = () => 'marine-reef-pores-v1'
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = `varying vec3 vReef;\n${shader.vertexShader}`.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\nvReef=position;',
    )
    shader.fragmentShader =
      `varying vec3 vReef;\n${shader.fragmentShader}`.replace(
        '#include <color_fragment>',
        `
      #include <color_fragment>
      vec3 cell=vReef*95.0;
      float detail=1.0-smoothstep(0.3,1.4,length(fwidth(cell)));
      float pore=pow(max(0.0,sin(cell.x+sin(cell.z))*sin(cell.y+cos(cell.z))),6.0)*detail;
      float mottling=sin(vReef.x*18.0+sin(vReef.z*13.0))*cos(vReef.y*24.0)*0.08;
      diffuseColor.rgb*=0.94+mottling-pore*0.35;
    `,
      )
  }
  return material
}

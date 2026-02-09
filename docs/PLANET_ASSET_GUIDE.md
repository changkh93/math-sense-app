# 🪐 행성 커스텀 에셋 제작 및 적용 가이드

이 문서는 '수학 은하 탐험'에서 새로운 학습 지역(행성)이 추가될 때, 고유한 시각적 테마를 적용하는 방법을 설명합니다.

---

## 1. 🎨 텍스처 이미지 생성 (Texture Generation)

행성의 표면을 표현하는 텍스처 이미지를 생성해야 합니다. AI 이미지 생성 도구(DALL-E 3, Midjourney 등)를 활용하면 효과적입니다.

### 📋 권장 사양
- **해상도**: 1024x512 px 또는 512x256 px (가로:세로 2:1 비율 권장, Three.js 구형 텍스처 매핑 최적화)
- **파일 형식**: PNG 권장 (JPG도 가능)
- **스타일**: Seamless (이음새가 자연스러운), Top-down view (위에서 본 듯한 평면도 느낌)

### 💡 프롬프트 예시 (AI 생성 시)

**1. 곱셈의 바다 (Sea of Multiplication)**
> "A seamless texture of a deep blue ocean planet surface, top-down view for 3D sphere mapping. Dark blue waters with swirling white foam waves, mystical glowing bio-luminescent patches. Highly detailed, vibrant colors, 8k resolution, flat texture map."

**2. 비와 비례식의 성 (Castle of Ratio)**
> "A seamless texture of a golden mechanical planet surface, steampunk style. intricate brass gears and pipes, metallic plates, golden patterns. Top-down view for 3D sphere mapping. Highly detailed, shiny metal reflection, 8k resolution, flat texture map."

**3. 가스 행성 (Cloud/Gas Giant)**
> "A seamless texture of a gas giant planet, swirling pastel clouds of pink, purple, and soft blue. Dreamy atmosphere, thick gaseous layers. Top-down view for 3D sphere mapping. Highly detailed, ethereal style, 8k resolution."

---

## 2. 📂 파일 저장 및 관리

생성된 이미지를 프로젝트의 정적 에셋 폴더에 저장합니다.

1. **저장 위치**: `public/assets/planets/` (프로젝트 루트 기준)
   - 만약 폴더가 없다면 생성해주세요.
2. **파일명 규칙**: 소문자 영문 사용 (예: `ocean.png`, `castle.png`, `cloud.png`)

---

## 3. 💻 코드 적용 (Code Integration)

새로운 행성 타입을 코드에 등록하고 연결하는 과정입니다.

### Step 3-1. 텍스처 로더 등록 (`src/components/Space/Planet3D.jsx`)

`Planet3D.jsx` 파일 내의 `CustomPlanetMaterial` 컴포넌트를 찾아, 새로운 텍스처 경로를 추가합니다.

```javascript
// src/components/Space/Planet3D.jsx

function CustomPlanetMaterial({ planetType, planetTexture, color }) {
  const texturePath = useMemo(() => {
    // [기존 코드]
    if (planetType === 'forest') return '/assets/planets/forest.png'
    if (planetType === 'ice') return '/assets/planets/ice.png'
    if (planetType === 'lava') return '/assets/planets/lava.png'
    
    // ✨ [NEW] 여기에 새로운 행성을 추가하세요!
    if (planetType === 'ocean') return '/assets/planets/ocean.png'   // 곱셈의 바다
    if (planetType === 'castle') return '/assets/planets/castle.png' // 비와 비례식
    if (planetType === 'cloud') return '/assets/planets/cloud.png'   // 가스 행성
    
    return null
  }, [planetType])
  
  // ... (이후 코드는 수정 불필요)
}
```

### Step 3-2. 3D 장식물 추가 (선택 사항) (`src/components/Space/Planet3D.jsx`)

행성 주위에 떠다니는 장식(Decorations)을 추가하고 싶다면, `RotatingPlanet` 컴포넌트의 `decorations` useMemo를 수정합니다.

```javascript
// src/components/Space/Planet3D.jsx -> RotatingPlanet 내부

const decorations = useMemo(() => {
  // ... (기존 코드) ...

  for (let i = 0; i < count; i++) {
    // ... (좌표 계산 코드) ...

    // ✨ [NEW] 바다 행성: 물방울이나 거품 (투명한 구체)
    if (planetType === 'ocean') {
      const bubbleSize = 0.1 * (Math.random() + 0.5)
      items.push(
        <mesh key={i} position={[x, y, z]}>
          <sphereGeometry args={[bubbleSize, 8, 8]} />
          <meshStandardMaterial 
            color="#a2d9ff" 
            transparent 
            opacity={0.6} 
            emissive="#a2d9ff"
            emissiveIntensity={0.5}
          />
        </mesh>
      )
    }
    
    // ✨ [NEW] 성 행성: 금속 큐브나 기어 (박스 형태)
    else if (planetType === 'castle') {
      const size = 0.15 * (Math.random() + 0.5)
      items.push(
        <mesh key={i} position={[x, y, z]} lookAt={pos.multiplyScalar(2)}>
          <boxGeometry args={[size, size, size]} />
          <meshStandardMaterial color="#ffd700" metalness={0.8} roughness={0.2} />
        </mesh>
      )
    }
    
    // ... (기존 숲/얼음/용암 if-else 블록) ...
  }
  return items
}, [planetType, size])
```

### Step 3-3. 지역 이름과 행성 타입 연결 (`src/components/Space/SpaceHome.jsx`)

마지막으로, `SpaceHome.jsx`에서 지역 이름(Region Title)에 따라 어떤 `planetType`을 사용할지 결정하는 로직을 업데이트합니다.

```javascript
// src/components/Space/SpaceHome.jsx

// ... map 함수 내부 ...
{regions?.map((region, idx) => {
  // ...

  // 행성 타입 매핑 로직
  let planetType = 'default'
  let planetColor = '#00d4ff'
  
  // [기존 매핑]
  if (region.title.includes('숲')) {
    planetType = 'forest'; planetColor = '#348c31';
  } else if (region.title.includes('나눗셈')) { 
    planetType = 'lava'; planetColor = '#ff4500';
  } else if (region.title.includes('소수') || region.title.includes('분수')) {
    planetType = 'ice'; planetColor = '#81d4fa';
  } 
  
  // ✨ [NEW] 새로운 키워드 매칭 추가 (여기를 수정하세요)
  else if (region.title.includes('곱셈')) {     // "곱셈의 바다"
    planetType = 'ocean'; planetColor = '#0077be';
  } else if (region.title.includes('비와')) {   // "비와 비례식의 성"
    planetType = 'castle'; planetColor = '#ffd700';
  } else {
    // 기본값 (랜덤)
    planetType = ['default', 'crystal', 'cloud'][idx % 3]
  }

  // ...
})}
```

---

## 4. ✅ 확인 및 테스트

1. 터미널에서 `npm run dev`가 실행 중인지 확인합니다.
2. 브라우저(`localhost:5173`)에서 새로고침 후, 해당 지역의 행성이 새로운 텍스처와 장식물로 변경되었는지 확인합니다.
3. 텍스처 파일명을 틀리거나 경로가 잘못되면 기본(얼음) 텍스처가 로드되므로, 파일명이 정확한지 꼭 확인하세요.

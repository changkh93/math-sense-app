export const regions = [
  {
    id: 'addition',
    title: '아디테라 (Additera)',
    description: '덧셈과 뺄셈의 생명이 숨 쉬는 숲의 행성',
    icon: '🌲',
    color: '#1dd1a1',
    image: '/assets/regions/addition.png',
    pdf: '덧뺄셈-230210.pdf',
    chapters: [
      {
        id: 'add_chap1',
        title: '제1장: 더하기, 빼기 의미',
        units: [
          { id: 'unit1', title: '1. 더하기 의미 (p9)' },
          { id: 'unit2', title: '2. 빼기 의미 (p21)' },
          { id: 'unit3', title: '3. 같다, 같지 않다, 크다, 작다 (p31)' }
        ]
      },
      {
        id: 'add_chap2',
        title: '제2장: 덧셈',
        units: [
          { id: 'unit1', title: '1. 작은 수 덧셈 (p41)' },
          { id: 'unit2', title: '2. 합이 10 이상인 덧셈 (p47)' },
          { id: 'unit3', title: '3. 로마숫자 덧셈 (p55)' },
          { id: 'unit4', title: '4. 자릿값 (p59)' },
          { id: 'unit5', title: '5. 덧셈의 특징 (p67)' },
          { id: 'unit6', title: '6. 받아 올림 (p75)' },
          { id: 'unit7', title: '7. 문자식 덧셈 (p83)' }
        ]
      },
      {
        id: 'add_chap3',
        title: '제3장: 뺄셈',
        units: [
          { id: 'unit1', title: '1. 작은 수 뺄셈 (p89)' },
          { id: 'unit2', title: '2. 연속 빼기 (p97)' },
          { id: 'unit3', title: '3. 세로셈과 자릿값 (p100)' },
          { id: 'unit4', title: '4. 받아 내림 (p107)' },
          { id: 'unit5', title: '5. 뺄셈의 특징 (p115)' },
          { id: 'unit6', title: '6. 문자식 뺄셈 (p123)' }
        ]
      }
    ]
  },
  {
    id: 'multiplication',
    title: '멀티플루비아 (Multipluvia)',
    description: '무한한 곱셈의 파도가 치는 신비로운 바다 행성',
    icon: '🌊',
    color: '#4834d4',
    image: '/assets/regions/multiplication.png',
    pdf: '곱셈-230210.pdf',
    chapters: [
      {
        id: 'mul_chap1',
        title: '제1장: 곱셈의 의미',
        units: [
          { id: 'unit1', title: '1. 반복해서 더하기 (p9)' },
          { id: 'unit2', title: '2. 무엇을 몇 번 반복 (p14)' },
          { id: 'unit3', title: '3. 같은 크기의 묶음 (p20)' },
          { id: 'unit4', title: '4. 배(倍) (p32)' },
          { id: 'unit5', title: '5. 반복해서 쌓아 올리기 (p36)' },
          { id: 'unit6', title: '6. 같은 방향으로 반복해서 붙이기 (p41)' },
          { id: 'unit7', title: '7. 더하기의 반복 (p44)' }
        ]
      },
      {
        id: 'mul_chap2',
        title: '제2장: 곱셈 구구',
        units: [
          { id: 'unit1', title: '1. 2단 (p51)' },
          { id: 'unit2', title: '2. 3단 (p55)' },
          { id: 'unit3', title: '3. 4단 (p59)' },
          { id: 'unit4', title: '4. 5단 (p63)' },
          { id: 'unit5', title: '5. 6단 (p67)' },
          { id: 'unit6', title: '6. 7단 (p71)' },
          { id: 'unit7', title: '7. 8단 (p75)' },
          { id: 'unit8', title: '8. 9단 (p79)' }
        ]
      },
      {
        id: 'mul_chap3',
        title: '제3장: 곱셈의 성질과 큰 수 곱셈',
        units: [
          { id: 'unit1', title: '1. 더하기와 곱하기의 차이 (p85)' },
          { id: 'unit2', title: '2. 곱셈의 성질 (p91)' },
          { id: 'unit3', title: '3. 마이너스 곱셈 (p96)' },
          { id: 'unit4', title: '4. 덧셈과 곱셈의 혼합 계산 (p106)' },
          { id: 'unit5', title: '5. 묶음표, ( ) (p110)' },
          { id: 'unit6', title: '6. 10 곱하기 (p122)' },
          { id: 'unit7', title: '7. 세로셈 (p128)' },
          { id: 'unit8', title: '8. 큰 수끼리의 곱셈 (p139)' }
        ]
      }
    ]
  },
  {
    id: 'division',
    title: '디비디아 (Dividia)',
    description: '나눗셈의 균형을 찾아가는 날카로운 계곡의 행성',
    icon: '⛰️',
    color: '#eb4d4b',
    image: '/assets/regions/division.png',
    pdf: '수학감각_나눗셈.pdf',
    chapters: [
      {
        id: 'div_chap1',
        title: '나눗셈 (Division)',
        units: [
          { id: 'unit1', title: '1. 나누기란?' },
          { id: 'unit2', title: '2. 나누기의 수학적 표현' },
          { id: 'unit3', title: '3. 나누어진 결과로 나눗셈 표현하기' },
          { id: 'unit4', title: '4. 묶음(그룹)으로 생각하기' },
          { id: 'unit5', title: '5. 몇 층으로 쌓아 올리면 될까?' },
          { id: 'unit6', title: '6. 구성하는 것을 한 묶음으로...' },
          { id: 'unit7', title: '7. 곱셈구구와 나눗셈' },
          { id: 'unit8', title: '8. 등분제와 포함제' },
          { id: 'unit9', title: '9. 돈으로 나누기' },
          { id: 'unit10', title: '10. 세로셈으로 표현하기' },
          { id: 'unit11', title: '11. 자릿수 맞추기' },
          { id: 'unit12', title: '12. 나머지(Remainder)' },
          { id: 'unit13', title: '13. 검산' },
          { id: 'unit14', title: '14. 세로셈 원리' },
          { id: 'unit15', title: '15. 큰 수 나눗셈' }
        ]
      }
    ]
  },
  {
    id: 'fractions',
    title: '프락토니스 (Fractonis)',
    description: '조각난 진실이 모여 하나가 되는 분수의 섬 행성',
    icon: '🏝️',
    color: '#f0932b',
    image: '/assets/regions/fractions.png',
    pdf: '분수1권-230210.pdf',
    chapters: [
      {
        id: 'chap1',
        title: '제1장: 분수의 뜻과 표현',
        units: [
          { id: 'unit1', title: '1. 분수와 나누기' },
          { id: 'unit2', title: '2. 전체와 부분' },
          { id: 'unit3', title: '3. 분모와 분자' },
          { id: 'unit4', title: '4. 조각으로 나누어진 몫' },
          { id: 'unit5', title: '5. 한 집합의 부분 개수' },
          { id: 'unit6', title: '6. 수직선 위의 분수' }
        ]
      },
      {
        id: 'chap2',
        title: '제2장: 분수의 크기 비교',
        units: [
          { id: 'unit1', title: '1. 같은 크기 - 막대 모델' },
          { id: 'unit2', title: '2. 같은 크기 - 빌딩 모델' },
          { id: 'unit3', title: '3. 같은 크기 - 수와 문자' },
          { id: 'unit4', title: '4. 엇갈려서 곱하기 기초' },
          { id: 'unit5', title: '5. 약분' },
          { id: 'unit6', title: '6. 카드 관찰 1' },
          { id: 'unit7', title: '7. 카드 관찰 2' },
          { id: 'unit8', title: '8. 0에 가까운 분수' },
          { id: 'unit9', title: '9. 1에 가까운 분수' },
          { id: 'unit10', title: '10. 통분' },
          { id: 'unit11', title: '11. 엇갈려서 곱하기 심화' }
        ]
      },
      {
        id: 'chap3',
        title: '제1장: 분수의 덧셈, 뺄셈',
        units: [
          { id: 'unit1', title: '1. 분모가 같은 분수의 덧셈과 뺄셈' },
          { id: 'unit2', title: '2. whole number(전체수)' },
          { id: 'unit3', title: '3. 대분수' },
          { id: 'unit4', title: '4. 가분수' },
          { id: 'unit5', title: '5. 가분수를 대분수로 바꾸기' },
          { id: 'unit6', title: '6. 대분수의 덧셈과 뺄셈' },
          { id: 'unit7', title: '7. 분모가 다른 분수의 덧셈' },
          { id: 'unit8', title: '8. 분모가 다른 분수의 뺄셈' }
        ]
      },
      {
        id: 'chap4',
        title: '제2장: 분수의 곱셈, 나눗셈',
        units: [
          { id: 'unit1', title: '1. 자연수와 분수의 곱셈' },
          { id: 'unit2', title: '2. 집합의 일부분에 대한 분수 표현' },
          { id: 'unit3', title: '3. 분수끼리의 곱셈' },
          { id: 'unit4', title: '4. 나누기를 곱하기로 표현하기' },
          { id: 'unit5', title: '5. 분수의 나눗셈' },
          { id: 'unit6', title: '6. 번분수' },
          { id: 'unit7', title: '7. 분수의 분수' },
          { id: 'unit8', title: '8. 문자를 포함한 분수' }
        ]
      }
    ]
  },
  {
    id: 'decimals',
    title: '소수 (Decimals)',
    description: '소수의 개념과 사칙연산을 완전 정복!',
    icon: 'FaCalculator',
    color: 'from-green-500 to-teal-500',
    image: '/images/decimals.png',
    chapters: [
      {
        id: 'chap5',
        title: '제1장: 소수의 개념',
        units: [
          { id: 'unit1', title: '1. 십진법 (Decimal System)' },
          { id: 'unit2', title: '2. 소수와 십분의 몇' },
          { id: 'unit3', title: '3. 소수와 백분의 몇' },
          { id: 'unit4', title: '4. 수직선에서의 소수' },
          { id: 'unit5', title: '5. 십진분수 (Decimal fraction)' },
          { id: 'unit6', title: '6. 관례적 표현' },
          { id: 'unit7', title: '7. 소수의 반올림 (rounding)' },
          { id: 'unit8', title: '8. 자릿값 알아보기' }
        ]
      },
      {
        id: 'chap6',
        title: '제2장: 소수의 사칙연산',
        units: [
          { id: 'unit1', title: '1. 소수의 덧셈' },
          { id: 'unit2', title: '2. 세로셈으로 바꾸기' },
          { id: 'unit3', title: '3. 소수의 뺄셈' },
          { id: 'unit4', title: '4. 소수점의 이동' },
          { id: 'unit5', title: '5. 소수를 자연수처럼 표현하기' },
          { id: 'unit6', title: '6. 자연수와 소수의 곱셈' },
          { id: 'unit7', title: '7. 소수와 소수의 곱셈' },
          { id: 'unit8', title: '8. 소수 나누기 자연수' },
          { id: 'unit9', title: '9. 자연수 나누기 자연수' },
          { id: 'unit10', title: '10. 소수 나누기 소수' },
          { id: 'unit11', title: '11. 분수와 소수의 관계' }
        ]
      }
    ]
  },
  {
    id: 'decimals',
    title: '데시멜라 (Decimella)',
    description: '0.1의 작은 기적이 소용돌이치는 가스 행성',
    icon: '🌾',
    color: '#6ab04c',
    image: '/assets/regions/decimals.png',
    pdf: '소수-230210.pdf'
  },
  {
    id: 'ratios',
    title: '라티오카스 (Ratiocast)',
    description: '비와 비례식의 황금 법칙이 다스리는 성의 행성',
    icon: '🏰',
    color: '#f9ca24',
    image: '/assets/regions/ratios.png',
    pdf: '비와 비례식1-230210.pdf',
    chapters: [
      {
        id: 'ratio_chap1',
        title: '제1장: 비(ratio)란?',
        units: [
          { id: 'unit1', title: '1. 비의 뜻' },
          { id: 'unit2', title: '2. 비교량과 기준량' },
          { id: 'unit3', title: '3. 비를 읽는 여러가지 방법' },
          { id: 'unit4', title: '4. 개별과 전체 개수의 비' },
          { id: 'unit5', title: '5. 길이의 비' },
          { id: 'unit6', title: '6. 비를 간단하고 분명하게 표현하기' },
          { id: 'unit7', title: '7. 비(ratio)의 크기 비교' },
          { id: 'unit8', title: '8. 유비(analogy)' }
        ]
      },
      {
        id: 'ratio_chap2',
        title: '제2장: 비례식 기초',
        units: [
          { id: 'unit1', title: '1. 비례식(Proportion)의 성질' },
          { id: 'unit2', title: '2. 길이의 비와 비례식' },
          { id: 'unit3', title: '3. 미지수 x (엑스)' },
          { id: 'unit4', title: '4. 비례식의 성질을 이용한 x값 구하기' },
          { id: 'unit5', title: '5. 닮은꼴' },
          { id: 'unit6', title: '6. 퍼센트 (%)' }
        ]
      },
      {
        id: 'ratio_chap3',
        title: '비(ratio) 응용',
        desc: '비와 비례식2 - Chapter 1',
        units: [
          { id: 'unit1', title: '1. 연비(three term ratios)' },
          { id: 'unit2', title: '2. 비례배분' },
          { id: 'unit3', title: '3. 증가율' },
          { id: 'unit4', title: '4. 할인율' },
          { id: 'unit5', title: '5. 길이 단위 변환' },
          { id: 'unit6', title: '6. 축척과 실제 길이' },
          { id: 'unit7', title: '7. 시간 단위 변환' }
        ]
      },
      {
        id: 'ratio_chap4',
        title: 'rate(비율) 개념과 응용',
        desc: '비와 비례식2 - Chapter 2',
        units: [
          { id: 'unit1', title: '1. rate(비율)란?' },
          { id: 'unit2', title: '2. 속력(speed)' },
          { id: 'unit3', title: '3. 비례식을 활용한 rate 문제 풀이' },
          { id: 'unit4', title: '4. 진하기(농도)' },
          { id: 'unit5', title: '5. unitary method(single unit를 활용한 방법)' }
        ]
      }
    ]
  }
];

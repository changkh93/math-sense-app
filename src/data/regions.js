export const regions = [
  {
    id: 'addition',
    title: '연산의 숲',
    description: '더하기와 빼기의 기초를 탄탄하게!',
    icon: '🌲',
    color: '#1dd1a1',
    image: '/assets/regions/addition.png',
    pdf: '덧뺄셈-230210.pdf'
  },
  {
    id: 'multiplication',
    title: '곱셈의 바다',
    description: '묶어 세기의 마법을 배워봐요.',
    icon: '🌊',
    color: '#4834d4',
    image: '/assets/regions/multiplication.png',
    pdf: '곱셈-230210.pdf'
  },
  {
    id: 'division',
    title: '나눗셈의 계곡',
    description: '똑같이 나누어 보는 신기한 탐험!',
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
    title: '분수의 섬',
    description: '조각난 조각들이 모여 하나가 돼요.',
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
    title: '소수의 들판',
    description: '0.1의 작은 세상이 펼쳐집니다.',
    icon: '🌾',
    color: '#6ab04c',
    image: '/assets/regions/decimals.png',
    pdf: '소수-230210.pdf'
  },
  {
    id: 'ratios',
    title: '비와 비례식의 성',
    description: '서로의 관계를 숫자로 표현해봐요.',
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

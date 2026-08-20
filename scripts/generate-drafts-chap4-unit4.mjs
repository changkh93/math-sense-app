import fs from 'node:fs';

const unitId = 'ratios_ratio_chap4_unit4';

const pagesData = [
  // Page 1: Slide 120
  {
    pageId: 'page_1787004267045_1',
    summary: '뜻풀이 문제 1, 2, 3 - 농도(진하기)의 정의와 기준량, 단위 (4지선다형)',
    elements: [
      {
        clientKey: 'q1',
        type: 'multiple-choice',
        answer: '① 소금물',
        options: ['① 소금물', '② 설탕물', '③ 짬뽕', '④ 짜장'],
        problemLabel: '뜻풀이 문제 1',
        responseLabel: '소금과 물의 혼합물',
        hints: ['물과 소금을 합하면 소금물이 됩니다.', '①을 선택하세요.'],
        sourceText: '물과 소금을 합하면 무엇이 되나요?',
        confidence: 0.99,
        position: { top: 50.5, left: 32.0, width: 54.0, height: 8.0 }
      },
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '① 소금물(소금+물)',
        options: ['① 소금물(소금+물)', '② 소금', '③ 콧물', '④ 물'],
        problemLabel: '뜻풀이 문제 2',
        responseLabel: '농도의 기준량',
        hints: ['농도를 구할 때 기준량은 전체인 소금물(소금+물)입니다.', '①을 선택하세요.'],
        sourceText: '소금물에 있는 소금의 진하기(농도)를 구할 때 기준량은?',
        confidence: 0.99,
        position: { top: 65.5, left: 32.0, width: 54.0, height: 8.0 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '① 퍼센트(%)',
        options: ['① 퍼센트(%)', '② 노래', '③ 욕설', '④ 비방'],
        problemLabel: '뜻풀이 문제 3',
        responseLabel: '농도의 단위',
        hints: ['농도를 표현하는 대표적인 단위는 퍼센트(%)입니다.', '①을 선택하세요.'],
        sourceText: '진하기(농도)를 표현하는 단위는 무엇인요?',
        confidence: 0.99,
        position: { top: 80.5, left: 32.0, width: 54.0, height: 8.0 }
      }
    ]
  },

  // Page 2: Slide 121
  {
    pageId: 'page_1787004267045_2',
    summary: '연습문제 1 - 비를 이용한 백분율 농도 구하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '② 70%',
        options: ['① 30%', '② 70%', '③ 37%', '④ 73%'],
        problemLabel: '(2)',
        responseLabel: '여자의 백분율',
        hints: ['전체는 3 + 7 = 10입니다.', '여자의 비율은 7/10 = 0.7 = 70%입니다.', '② 70%를 선택하세요.'],
        sourceText: '남자와 여자의 비가 3 : 7일 때, 여자가 몇 %입니까?',
        confidence: 0.99,
        position: { top: 78.0, left: 16.0, width: 31.0, height: 8.0 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '② 40%',
        options: ['① 20%', '② 40%', '③ 60%', '④ 66.6%'],
        problemLabel: '(4)',
        responseLabel: '설탕의 농도',
        hints: ['전체 설탕물은 2 + 3 = 5입니다.', '설탕의 비율은 2/5 = 0.4 = 40%입니다.', '② 40%를 선택하세요.'],
        sourceText: '설탕과 물의 비가 2 : 3일 때, 설탕물에서 설탕의 농도는?',
        confidence: 0.99,
        position: { top: 78.0, left: 53.5, width: 31.0, height: 8.0 }
      }
    ]
  },

  // Page 3: Slide 122
  {
    pageId: 'page_1787004267045_3',
    summary: '연습문제 2 - 물과 소금의 합으로 소금물 전체 무게 구하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '② 207g',
        options: ['① 200g', '② 207g', '③ 270g', '④ 2070g'],
        problemLabel: '(2)',
        responseLabel: '소금물 무게',
        hints: ['물 200g + 소금 7g = 207g 입니다.', '②를 선택하세요.'],
        sourceText: '물 200g에 소금 7g을 넣었을 때, 소금물은 몇 g인가요?',
        confidence: 0.99,
        position: { top: 43.5, left: 31.0, width: 14.5, height: 4.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '② 100g',
        options: ['① 99g', '② 100g', '③ 101g', '④ 109g'],
        problemLabel: '(3)',
        responseLabel: '소금물 무게',
        hints: ['물 99g + 소금 1g = 100g 입니다.', '②를 선택하세요.'],
        sourceText: '물 99g에 소금 1g을 넣었을 때, 소금물은 몇 g인가요?',
        confidence: 0.99,
        position: { top: 63.5, left: 31.0, width: 14.5, height: 4.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '③ 87g',
        options: ['① 73g', '② 80g', '③ 87g', '④ 94g'],
        problemLabel: '(4)',
        responseLabel: '소금물 무게',
        hints: ['물 80g + 소금 7g = 87g 입니다.', '③을 선택하세요.'],
        sourceText: '물 80g에 소금 7g을 넣었을 때, 소금물은 몇 g인가요?',
        confidence: 0.99,
        position: { top: 83.5, left: 31.0, width: 14.5, height: 4.5 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: '③ 120g',
        options: ['① 80g', '② 100g', '③ 120g', '④ 200g'],
        problemLabel: '(5)',
        responseLabel: '소금물 무게',
        hints: ['물 100g + 소금 20g = 120g 입니다.', '③을 선택하세요.'],
        sourceText: '물 100g에 소금 20g을 넣었을 때, 소금물은 몇 g인가요?',
        confidence: 0.99,
        position: { top: 23.5, left: 68.5, width: 14.5, height: 4.5 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '③ 81g',
        options: ['① 69g', '② 75g', '③ 81g', '④ 86g'],
        problemLabel: '(6)',
        responseLabel: '소금물 무게',
        hints: ['물 75g + 소금 6g = 81g 입니다.', '③을 선택하세요.'],
        sourceText: '물 75g에 소금 6g을 넣었을 때, 소금물은 몇 g인가요?',
        confidence: 0.99,
        position: { top: 43.5, left: 68.5, width: 14.5, height: 4.5 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: '③ 127g',
        options: ['① 119g', '② 123g', '③ 127g', '④ 134g'],
        problemLabel: '(7)',
        responseLabel: '소금물 무게',
        hints: ['물 123g + 소금 4g = 127g 입니다.', '③을 선택하세요.'],
        sourceText: '물 123g에 소금 4g을 넣었을 때, 소금물은 몇 g인가요?',
        confidence: 0.99,
        position: { top: 63.5, left: 68.5, width: 14.5, height: 4.5 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '③ 60g',
        options: ['① 50g', '② 55g', '③ 60g', '④ 65g'],
        problemLabel: '(8)',
        responseLabel: '소금물 무게',
        hints: ['물 55g + 소금 5g = 60g 입니다.', '③을 선택하세요.'],
        sourceText: '물 55g에 소금 5g을 넣었을 때, 소금물은 몇 g인가요?',
        confidence: 0.99,
        position: { top: 83.5, left: 68.5, width: 14.5, height: 4.5 }
      }
    ]
  },

  // Page 4: Slide 123
  {
    pageId: 'page_1787004267045_4',
    summary: '연습문제 3 - 소금물에서 물 또는 소금의 양 구하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '② 50g',
        options: ['① 30g', '② 50g', '③ 150g', '④ 350g'],
        problemLabel: '(2)',
        responseLabel: '소금의 양',
        hints: ['소금물 200g - 물 150g = 50g 입니다.', '②를 선택하세요.'],
        sourceText: '물 150g에 약간의 소금을 넣었더니, 소금물 200g 되었다면, 소금의 양은?',
        confidence: 0.99,
        position: { top: 43.5, left: 31.0, width: 14.5, height: 4.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '③ 9g',
        options: ['① 1g', '② 8g', '③ 9g', '④ 11g'],
        problemLabel: '(3)',
        responseLabel: '물의 양',
        hints: ['소금물 10g - 소금 1g = 9g 입니다.', '③을 선택하세요.'],
        sourceText: '소금물 10g에 1g의 소금이 녹아 있다면, 물은 몇 g인가요?',
        confidence: 0.99,
        position: { top: 63.5, left: 31.0, width: 14.5, height: 4.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '② 50g',
        options: ['① 40g', '② 50g', '③ 60g', '④ 150g'],
        problemLabel: '(4)',
        responseLabel: '소금의 양',
        hints: ['소금물 900g - 물 850g = 50g 입니다.', '②를 선택하세요.'],
        sourceText: '물 850g에 약간의 소금을 넣었더니, 소금물 900g 되었다면, 소금의 양은?',
        confidence: 0.99,
        position: { top: 83.5, left: 31.0, width: 14.5, height: 4.5 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: '② 31g',
        options: ['① 21g', '② 31g', '③ 41g', '④ 50g'],
        problemLabel: '(5)',
        responseLabel: '소금의 양',
        hints: ['소금물 81g - 물 50g = 31g 입니다.', '②를 선택하세요.'],
        sourceText: '물 50g에 약간의 소금을 넣었더니, 소금물 81g 되었다면, 소금의 양은?',
        confidence: 0.99,
        position: { top: 23.5, left: 68.5, width: 14.5, height: 4.5 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '② 290g',
        options: ['① 270g', '② 290g', '③ 300g', '④ 330g'],
        problemLabel: '(6)',
        responseLabel: '물의 양',
        hints: ['소금물 310g - 소금 20g = 290g 입니다.', '②를 선택하세요.'],
        sourceText: '소금물 310g에 소금 20g이 녹아 있다면, 물은 몇 g인가요?',
        confidence: 0.99,
        position: { top: 43.5, left: 68.5, width: 14.5, height: 4.5 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: '① 3g',
        options: ['① 3g', '② 7g', '③ 13g', '④ 77g'],
        problemLabel: '(7)',
        responseLabel: '소금의 양',
        hints: ['소금물 80g - 물 77g = 3g 입니다.', '①을 선택하세요.'],
        sourceText: '물 77g에 약간의 소금을 넣었더니, 소금물 80g 되었다면, 소금의 양은?',
        confidence: 0.99,
        position: { top: 63.5, left: 68.5, width: 14.5, height: 4.5 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '② 43g',
        options: ['① 33g', '② 43g', '③ 53g', '④ 63g'],
        problemLabel: '(8)',
        responseLabel: '물의 양',
        hints: ['소금물 53g - 소금 10g = 43g 입니다.', '②를 선택하세요.'],
        sourceText: '소금물 53g에 10g의 소금이 녹아 있다면, 물은 몇 g인가요?',
        confidence: 0.99,
        position: { top: 83.5, left: 68.5, width: 14.5, height: 4.5 }
      }
    ]
  },

  // Page 5: Slide 124
  {
    pageId: 'page_1787004267045_5',
    summary: '뜻풀이 문제 4, 5, 6 - 용매, 용질, 용액의 개념 (4지선다형)',
    elements: [
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '④ 물',
        options: ['① 소금물', '② 소금', '③ 할매랑 다른가?', '④ 물'],
        problemLabel: '뜻풀이 문제 4',
        responseLabel: '용매의 의미',
        hints: ['녹이는 매개체 역할을 하는 것은 물(용매)입니다.', '④를 선택하세요.'],
        sourceText: '소금이 물에 녹아서 소금물이 되었을 때, 용매는?',
        confidence: 0.99,
        position: { top: 49.5, left: 32.0, width: 54.0, height: 8.0 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: '① 설탕',
        options: ['① 설탕', '② 소금', '③ 물', '④ 코딱지'],
        problemLabel: '뜻풀이 문제 5',
        responseLabel: '용질의 의미',
        hints: ['녹여지는 물질은 설탕(용질)입니다.', '①을 선택하세요.'],
        sourceText: '설탕이 물에 녹아서 설탕물이 되었을 때, 용질은?',
        confidence: 0.99,
        position: { top: 64.0, left: 32.0, width: 54.0, height: 8.0 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '③ 꿀물',
        options: ['① 꿀', '② 물', '③ 꿀물', '④ 소금물'],
        problemLabel: '뜻풀이 문제 6',
        responseLabel: '용액의 의미',
        hints: ['둘 이상이 섞인 혼합물은 꿀물(용액)입니다.', '③을 선택하세요.'],
        sourceText: '꿀을 물에 녹여서 꿀물을 만들었을 때, 용액은?',
        confidence: 0.99,
        position: { top: 78.5, left: 32.0, width: 54.0, height: 8.0 }
      }
    ]
  },

  // Page 6: Slide 125
  {
    pageId: 'page_1787004267045_6',
    summary: '연습문제 4 - 전체 크기(양)과 소금물의 농도(%) 구하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '① 전체 100g, 농도 3%',
        options: ['① 전체 100g, 농도 3%', '② 전체 97g, 농도 3.1%', '③ 전체 100g, 농도 30%', '④ 전체 94g, 농도 3%'],
        problemLabel: '(2)',
        responseLabel: '전체 및 농도',
        hints: ['전체는 3g + 97g = 100g입니다.', '농도는 3/100 = 3%입니다.', '①을 선택하세요.'],
        sourceText: '소금 3g, 물 97g 전체의 크기와 농도',
        confidence: 0.99,
        position: { top: 44.5, left: 31.0, width: 14.5, height: 4.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '② 전체 60g, 농도 20%',
        options: ['① 전체 60g, 농도 12%', '② 전체 60g, 농도 20%', '③ 전체 48g, 농도 25%', '④ 전체 60g, 농도 24%'],
        problemLabel: '(3)',
        responseLabel: '전체 및 농도',
        hints: ['전체는 12g + 48g = 60g입니다.', '농도는 12/60 = 20%입니다.', '②를 선택하세요.'],
        sourceText: '소금 12g, 물 48g 전체의 크기와 농도',
        confidence: 0.99,
        position: { top: 63.5, left: 31.0, width: 14.5, height: 4.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '② 전체 1000g, 농도 15%',
        options: ['① 전체 850g, 농도 15%', '② 전체 1000g, 농도 15%', '③ 전체 1000g, 농도 1.5%', '④ 전체 1000g, 농도 17.6%'],
        problemLabel: '(4)',
        responseLabel: '전체 및 농도',
        hints: ['전체는 150g + 850g = 1000g입니다.', '농도는 150/1000 = 15%입니다.', '②를 선택하세요.'],
        sourceText: '소금 150g, 물 850g 전체의 크기와 농도',
        confidence: 0.99,
        position: { top: 83.5, left: 31.0, width: 14.5, height: 4.5 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: '② 전체 50g, 농도 10%',
        options: ['① 전체 50g, 농도 5%', '② 전체 50g, 농도 10%', '③ 전체 45g, 농도 11.1%', '④ 전체 55g, 농도 10%'],
        problemLabel: '(5)',
        responseLabel: '전체 및 농도',
        hints: ['전체는 5g + 45g = 50g입니다.', '농도는 5/50 = 10%입니다.', '②를 선택하세요.'],
        sourceText: '소금 5g, 물 45g 전체의 크기와 농도',
        confidence: 0.99,
        position: { top: 23.5, left: 68.5, width: 14.5, height: 4.5 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '① 전체 100g, 농도 35%',
        options: ['① 전체 100g, 농도 35%', '② 전체 65g, 농도 35%', '③ 전체 100g, 농도 53.8%', '④ 전체 100g, 농도 3.5%'],
        problemLabel: '(6)',
        responseLabel: '전체 및 농도',
        hints: ['전체는 35g + 65g = 100g입니다.', '농도는 35/100 = 35%입니다.', '①을 선택하세요.'],
        sourceText: '소금 35g, 물 65g 전체의 크기와 농도',
        confidence: 0.99,
        position: { top: 44.5, left: 68.5, width: 14.5, height: 4.5 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: '③ 전체 220g, 농도 5%',
        options: ['① 전체 220g, 농도 11%', '② 전체 209g, 농도 5.2%', '③ 전체 220g, 농도 5%', '④ 전체 220g, 농도 0.5%'],
        problemLabel: '(7)',
        responseLabel: '전체 및 농도',
        hints: ['전체는 11g + 209g = 220g입니다.', '농도는 11/220 = 1/20 = 5%입니다.', '③을 선택하세요.'],
        sourceText: '소금 11g, 물 209g 전체의 크기와 농도',
        confidence: 0.99,
        position: { top: 63.5, left: 68.5, width: 14.5, height: 4.5 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '① 전체 80g, 농도 12.5%',
        options: ['① 전체 80g, 농도 12.5%', '② 전체 70g, 농도 14.3%', '③ 전체 80g, 농도 10%', '④ 전체 100g, 농도 10%'],
        problemLabel: '(8)',
        responseLabel: '전체 및 농도',
        hints: ['전체는 10g + 70g = 80g입니다.', '농도는 10/80 = 1/8 = 12.5%입니다.', '①을 선택하세요.'],
        sourceText: '소금 10g, 물 70g 전체의 크기와 농도',
        confidence: 0.99,
        position: { top: 83.5, left: 68.5, width: 14.5, height: 4.5 }
      }
    ]
  },

  // Page 7: Slide 126
  {
    pageId: 'page_1787004267045_7',
    summary: '연습문제 5 - 소금물의 농도(진하기) 백분율 계산 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '② 20%',
        options: ['① 10%', '② 20%', '③ 25%', '④ 40%'],
        problemLabel: '(2)',
        responseLabel: '소금물 농도',
        hints: ['전체는 40 + 10 = 50g입니다.', '농도는 10/50 = 20%입니다.', '② 20%를 선택하세요.'],
        sourceText: '물 40g에 소금 10g이 녹아 있음',
        confidence: 0.99,
        position: { top: 43.5, left: 16.0, width: 31.0, height: 5.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '① 20%',
        options: ['① 20%', '② 25%', '③ 31%', '④ 35%'],
        problemLabel: '(3)',
        responseLabel: '소금물 농도',
        hints: ['전체는 124 + 31 = 155g입니다.', '농도는 31/155 = 1/5 = 20%입니다.', '① 20%를 선택하세요.'],
        sourceText: '물 124g에 소금 31g이 녹아 있음',
        confidence: 0.99,
        position: { top: 63.5, left: 16.0, width: 31.0, height: 5.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '② 25%',
        options: ['① 20%', '② 25%', '③ 30%', '④ 33.3%'],
        problemLabel: '(4)',
        responseLabel: '소금물 농도',
        hints: ['전체는 9 + 3 = 12g입니다.', '농도는 3/12 = 1/4 = 25%입니다.', '② 25%를 선택하세요.'],
        sourceText: '물 9g에 소금 3g이 녹아 있음',
        confidence: 0.99,
        position: { top: 83.5, left: 16.0, width: 31.0, height: 5.5 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: '③ 25%',
        options: ['① 15%', '② 20%', '③ 25%', '④ 33.3%'],
        problemLabel: '(5)',
        responseLabel: '소금물 농도',
        hints: ['전체는 45 + 15 = 60g입니다.', '농도는 15/60 = 1/4 = 25%입니다.', '③ 25%를 선택하세요.'],
        sourceText: '물 45g에 소금 15g이 녹아 있음',
        confidence: 0.99,
        position: { top: 23.5, left: 53.5, width: 31.0, height: 5.5 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '① 6.25%',
        options: ['① 6.25%', '② 6.67%', '③ 10%', '④ 16%'],
        problemLabel: '(6)',
        responseLabel: '소금물 농도',
        hints: ['전체는 150 + 10 = 160g입니다.', '농도는 10/160 = 1/16 = 6.25%입니다.', '① 6.25%를 선택하세요.'],
        sourceText: '물 150g에 소금 10g이 녹아 있음',
        confidence: 0.99,
        position: { top: 43.5, left: 53.5, width: 31.0, height: 5.5 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: '② 20%',
        options: ['① 18%', '② 20%', '③ 25%', '④ 28%'],
        problemLabel: '(7)',
        responseLabel: '소금물 농도',
        hints: ['전체는 472 + 118 = 590g입니다.', '농도는 118/590 = 1/5 = 20%입니다.', '② 20%를 선택하세요.'],
        sourceText: '물 472g에 소금 118g이 녹아 있음',
        confidence: 0.99,
        position: { top: 63.5, left: 53.5, width: 31.0, height: 5.5 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '① 20%',
        options: ['① 20%', '② 23%', '③ 25%', '④ 28%'],
        problemLabel: '(8)',
        responseLabel: '소금물 농도',
        hints: ['전체는 92 + 23 = 115g입니다.', '농도는 23/115 = 1/5 = 20%입니다.', '① 20%를 선택하세요.'],
        sourceText: '물 92g에 소금 23g이 녹아 있음',
        confidence: 0.99,
        position: { top: 83.5, left: 53.5, width: 31.0, height: 5.5 }
      }
    ]
  },

  // Page 8: Slide 127
  {
    pageId: 'page_1787004267045_8',
    summary: '연습문제 6 - 농도와 소금물의 양으로 녹아 있는 소금의 양 구하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '③ 100g',
        options: ['① 20g', '② 50g', '③ 100g', '④ 200g'],
        problemLabel: '(2)',
        responseLabel: '녹아 있는 소금의 양',
        hints: ['소금물 500g의 20%는 500 × 20/100 = 100g입니다.', '③ 100g을 선택하세요.'],
        sourceText: '농도가 20%인 소금물 500g에 녹아 있는 소금의 양은?',
        confidence: 0.99,
        position: { top: 78.0, left: 16.0, width: 68.0, height: 8.0 }
      }
    ]
  },

  // Page 9: Slide 128
  {
    pageId: 'page_1787004267045_9',
    summary: '연습문제 7 - 농도별 녹아 있는 소금의 양 계산 (4지선다형)',
    elements: [
      {
        clientKey: 'q1',
        type: 'multiple-choice',
        answer: '③ 150g',
        options: ['① 30g', '② 100g', '③ 150g', '④ 300g'],
        problemLabel: '(1)',
        responseLabel: '녹아 있는 소금의 양',
        hints: ['500g의 30%는 500 × 30/100 = 150g입니다.', '③ 150g을 선택하세요.'],
        sourceText: '농도가 30%인 소금물 500g에 녹아 있는 소금의 양은?',
        confidence: 0.99,
        position: { top: 20.0, left: 16.0, width: 68.0, height: 8.0 }
      },
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '① 2g',
        options: ['① 2g', '② 4g', '③ 10g', '④ 20g'],
        problemLabel: '(2)',
        responseLabel: '녹아 있는 소금의 양',
        hints: ['100g의 2%는 100 × 2/100 = 2g입니다.', '① 2g을 선택하세요.'],
        sourceText: '농도가 2%인 소금물 100g에 녹아 있는 소금의 양은?',
        confidence: 0.99,
        position: { top: 39.5, left: 16.0, width: 68.0, height: 8.0 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '② 45g',
        options: ['① 10g', '② 45g', '③ 90g', '④ 450g'],
        problemLabel: '(3)',
        responseLabel: '녹아 있는 소금의 양',
        hints: ['450g의 10%는 450 × 10/100 = 45g입니다.', '② 45g을 선택하세요.'],
        sourceText: '농도가 10%인 소금물 450g에 녹아 있는 소금의 양은?',
        confidence: 0.99,
        position: { top: 58.5, left: 16.0, width: 68.0, height: 8.0 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '② 50g',
        options: ['① 25g', '② 50g', '③ 75g', '④ 100g'],
        problemLabel: '(4)',
        responseLabel: '녹아 있는 소금의 양',
        hints: ['250g의 20%는 250 × 20/100 = 50g입니다.', '② 50g을 선택하세요.'],
        sourceText: '농도가 20%인 소금물 250g에 녹아 있는 소금의 양은?',
        confidence: 0.99,
        position: { top: 78.0, left: 16.0, width: 68.0, height: 8.0 }
      }
    ]
  },

  // Page 10: Slide 129
  {
    pageId: 'page_1787004267045_10',
    summary: '연습문제 8 - 목표 농도의 소금물을 만들기 위한 소금과 물의 양 계산 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '① 소금 2.4g, 물 117.6g',
        options: ['① 소금 2.4g, 물 117.6g', '② 소금 2.0g, 물 118.0g', '③ 소금 2.4g, 물 122.4g', '④ 소금 24g, 물 96g'],
        problemLabel: '(2)',
        responseLabel: '소금과 물의 양',
        hints: ['소금 = 120 × 2/100 = 2.4g입니다.', '물 = 120 - 2.4 = 117.6g입니다.', '①을 선택하세요.'],
        sourceText: '농도가 2%인 소금물 120g을 만들기 위해 필요한 소금과 물의 양은?',
        confidence: 0.99,
        position: { top: 39.5, left: 16.0, width: 68.0, height: 8.0 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '② 소금 46g, 물 414g',
        options: ['① 소금 40g, 물 420g', '② 소금 46g, 물 414g', '③ 소금 46g, 물 460g', '④ 소금 10g, 물 450g'],
        problemLabel: '(3)',
        responseLabel: '소금과 물의 양',
        hints: ['소금 = 460 × 10/100 = 46g입니다.', '물 = 460 - 46 = 414g입니다.', '②를 선택하세요.'],
        sourceText: '농도가 10%인 소금물 460g을 만들기 위해 필요한 소금과 물의 양은?',
        confidence: 0.99,
        position: { top: 58.5, left: 16.0, width: 68.0, height: 8.0 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '① 소금 50.4g, 물 159.6g',
        options: ['① 소금 50.4g, 물 159.6g', '② 소금 48.0g, 물 162.0g', '③ 소금 50.4g, 물 160.0g', '④ 소금 24.0g, 물 186.0g'],
        problemLabel: '(4)',
        responseLabel: '소금과 물의 양',
        hints: ['소금 = 210 × 24/100 = 50.4g입니다.', '물 = 210 - 50.4 = 159.6g입니다.', '①을 선택하세요.'],
        sourceText: '농도가 24%인 소금물 210g을 만들기 위해 필요한 소금과 물의 양은?',
        confidence: 0.99,
        position: { top: 78.0, left: 16.0, width: 68.0, height: 8.0 }
      }
    ]
  },

  // Page 11: Slide 130
  {
    pageId: 'page_1787004267045_11',
    summary: '연습문제 9 - 정해진 소금으로 목표 농도를 만들기 위한 물의 양 계산 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '② 78g',
        options: ['① 52g', '② 78g', '③ 104g', '④ 130g'],
        problemLabel: '(2)',
        responseLabel: '필요한 물의 양',
        hints: ['전체 소금물은 26 × 100/25 = 104g입니다.', '물의 양 = 104 - 26 = 78g입니다.', '② 78g을 선택하세요.'],
        sourceText: '소금 26g으로 농도가 25%인 소금물을 만들기 위해 필요한 물의 양은?',
        confidence: 0.99,
        position: { top: 39.5, left: 16.0, width: 68.0, height: 8.0 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '② 16.5g',
        options: ['① 11.0g', '② 16.5g', '③ 27.5g', '④ 38.5g'],
        problemLabel: '(3)',
        responseLabel: '필요한 물의 양',
        hints: ['전체 소금물은 11 × 100/40 = 27.5g입니다.', '물의 양 = 27.5 - 11 = 16.5g입니다.', '② 16.5g을 선택하세요.'],
        sourceText: '소금 11g으로 농도가 40%인 소금물을 만들기 위해 필요한 물의 양은?',
        confidence: 0.99,
        position: { top: 58.5, left: 16.0, width: 68.0, height: 8.0 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '② 408g',
        options: ['① 306g', '② 408g', '③ 510g', '④ 612g'],
        problemLabel: '(4)',
        responseLabel: '필요한 물의 양',
        hints: ['전체 소금물은 102 × 100/20 = 510g입니다.', '물의 양 = 510 - 102 = 408g입니다.', '② 408g을 선택하세요.'],
        sourceText: '소금 102g으로 농도가 20%인 소금물을 만들기 위해 필요한 물의 양은?',
        confidence: 0.99,
        position: { top: 78.0, left: 16.0, width: 68.0, height: 8.0 }
      }
    ]
  }
];

export function generateTmpDraftJsonFiles() {
  for (const page of pagesData) {
    const payload = {
      schemaVersion: 2,
      unitId,
      pageId: page.pageId,
      analysis: {
        summary: page.summary,
        warnings: []
      },
      elements: page.elements
    };

    const outPath = `/private/tmp/workbook-draft-${unitId}-${page.pageId}.json`;
    fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');
    console.log(`Generated: ${outPath} (${page.elements.length} elements)`);
  }
}

if (process.argv[1]?.endsWith('generate-drafts-chap4-unit4.mjs')) {
  generateTmpDraftJsonFiles();
}

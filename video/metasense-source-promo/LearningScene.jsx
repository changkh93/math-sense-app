import React from 'react';
import {FeatureScene, palette} from './common.jsx';

export const LearningScene = () => (
  <FeatureScene
    number="02"
    eyebrow="이해에서 도전까지"
    headline={'보고, 풀고,\n다시 이해합니다'}
    body="영상과 데이터 로그, 문제와 복습이 끊기지 않는 하나의 학습 흐름으로 이어집니다."
    src="metasense-promo/source/02-learning-quiz.mp4"
    trimBefore={60}
    playbackRate={1.06}
    accent={palette.violet}
  />
);

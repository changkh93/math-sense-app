import React from 'react';
import {FeatureScene, palette} from './common.jsx';

export const PlanetScene = () => (
  <FeatureScene
    number="01"
    eyebrow="오늘의 학습 항로"
    headline={'배움의 길이\n눈앞에 펼쳐집니다'}
    body="오늘 할 일과 다음 목적지를 스스로 선택하고, 자신의 속도로 탐사를 시작합니다."
    src="metasense-promo/source/01-planet-map.mp4"
    playbackRate={0.8}
    accent={palette.cyan}
  />
);

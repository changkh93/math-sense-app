import React from 'react';
import {FeatureScene, palette} from './common.jsx';

export const StreakScene = () => (
  <FeatureScene
    number="03"
    eyebrow="STREAK JOURNEY"
    headline={'작은 실천이\n성장의 궤적이 됩니다'}
    body="오늘의 도전이 기록되고, 이어진 배움이 아이만의 성장 이야기가 됩니다."
    src="metasense-promo/source/03-streak.mp4"
    playbackRate={0.39}
    accent={palette.gold}
  />
);

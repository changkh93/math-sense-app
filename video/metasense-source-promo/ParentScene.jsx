import React from 'react';
import {FeatureScene, palette} from './common.jsx';

export const ParentScene = () => (
  <FeatureScene
    number="05"
    eyebrow="PARENT DASHBOARD"
    headline={'결과보다 먼저,\n과정을 바라봅니다'}
    body="부모님은 오늘의 학습, 과제와 피드백을 확인하며 통제자가 아닌 든든한 동반자가 됩니다."
    src="metasense-promo/source/05-parent-dashboard.mp4"
    trimBefore={30}
    playbackRate={1}
    accent={palette.pink}
    privacyMask
  />
);

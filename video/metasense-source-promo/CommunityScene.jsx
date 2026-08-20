import React from 'react';
import {FeatureScene, palette} from './common.jsx';

export const CommunityScene = () => (
  <FeatureScene
    number="04"
    eyebrow="STUDY CREW · STELLAR AGORA"
    headline={'함께 묻고,\n함께 나아갑니다'}
    body="스터디 크루와 질문 공간에서 막힘을 나누고, 서로의 배움을 다음 도전으로 연결합니다."
    src="metasense-promo/source/04-crew-agora.mp4"
    playbackRate={0.78}
    accent={palette.mint}
  />
);

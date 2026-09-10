import './index.css';
import {Composition} from 'remotion';
import {SpaceDefendersIntro} from './Composition';
export const RemotionRoot=()=> <Composition id="SpaceDefendersIntro" component={SpaceDefendersIntro} durationInFrames={1800} fps={30} width={1920} height={1080}/>;

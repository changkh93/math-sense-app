import './index.css';
import {Composition} from 'remotion';
import {MarsExpeditionIntro} from './Composition';
export const RemotionRoot=()=> <Composition id="MarsExpeditionIntro" component={MarsExpeditionIntro} durationInFrames={1800} fps={30} width={1920} height={1080}/>;

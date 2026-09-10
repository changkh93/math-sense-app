import './index.css';
import {Composition} from 'remotion';
import {ParentReel} from './Composition';
export const RemotionRoot=()=> <Composition id="MetaSenseGameProjects" component={ParentReel} durationInFrames={1080} fps={30} width={1080} height={1920}/>;

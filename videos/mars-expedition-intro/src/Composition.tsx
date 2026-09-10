import {TransitionSeries} from '@remotion/transitions';
import {Intro} from './scenes/Intro';
import {Gameplay} from './scenes/Gameplay';
import {Outro} from './scenes/Outro';
export const MarsExpeditionIntro=()=> <TransitionSeries>
 <TransitionSeries.Sequence durationInFrames={150}><Intro/></TransitionSeries.Sequence>
 <TransitionSeries.Sequence durationInFrames={1230}><Gameplay/></TransitionSeries.Sequence>
 <TransitionSeries.Sequence durationInFrames={180}><Gameplay mode="over"/></TransitionSeries.Sequence>
 <TransitionSeries.Sequence durationInFrames={240}><Outro/></TransitionSeries.Sequence>
 </TransitionSeries>;

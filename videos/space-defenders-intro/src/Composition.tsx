import {Sequence} from 'remotion';
import {Intro} from './scenes/Intro';
import {Gameplay} from './scenes/Gameplay';
import {Outro} from './scenes/Outro';
export const SpaceDefendersIntro=()=> <>
 <Sequence durationInFrames={150}><Intro/></Sequence>
 <Sequence from={150} durationInFrames={1125}><Gameplay/></Sequence>
 <Sequence from={1275} durationInFrames={150}><Gameplay mode="damage"/></Sequence>
 <Sequence from={1425} durationInFrames={120}><Gameplay mode="over"/></Sequence>
 <Sequence from={1545} durationInFrames={255}><Outro/></Sequence>
 </>;

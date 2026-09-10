import {staticFile,interpolate,useCurrentFrame} from 'remotion';
import {Audio} from '@remotion/media';
import {TransitionSeries} from '@remotion/transitions';
import {Hook} from './scenes/Hook';
import {Project} from './scenes/Projects';
import {Code} from './scenes/Code';
import {Learning} from './scenes/Learning';
import {Payoff} from './scenes/Payoff';
import {Closing} from './scenes/Closing';
export const ParentReel=()=>{const f=useCurrentFrame();return <>
 <Audio src={staticFile('pixelland-reel.wav')} volume={.8}/>
 <TransitionSeries>
 <TransitionSeries.Sequence durationInFrames={125}><Hook/></TransitionSeries.Sequence>
 <TransitionSeries.Sequence durationInFrames={149}><Project game="space"/></TransitionSeries.Sequence>
 <TransitionSeries.Sequence durationInFrames={149}><Project game="mars"/></TransitionSeries.Sequence>
 <TransitionSeries.Sequence durationInFrames={180}><Code/></TransitionSeries.Sequence>
 <TransitionSeries.Sequence durationInFrames={180}><Learning/></TransitionSeries.Sequence>
 <TransitionSeries.Sequence durationInFrames={117}><Payoff/></TransitionSeries.Sequence>
 <TransitionSeries.Sequence durationInFrames={180}><Closing/></TransitionSeries.Sequence>
 </TransitionSeries>
 <div style={{position:'absolute',left:0,bottom:0,height:6,width:`${interpolate(f,[0,1080],[0,100])}%`,background:'linear-gradient(90deg,#00f3ff,#8b5cf6,#00ff88)'}}/>
 </>};

import {AbsoluteFill,CanvasImage,staticFile,useCurrentFrame,interpolate} from 'remotion';
import {Audio} from '@remotion/media';
import {Background,Brand,Reveal,cyan} from '../style';
export const Intro=()=>{
 const f=useCurrentFrame();
 return <Background><Brand/><Audio src={staticFile('wave_ready.ogg')} volume={.5}/>
 <div style={{position:'absolute',left:80,top:230,width:1300}}>
 <Reveal style={{fontSize:46,color:cyan,letterSpacing:4}}>우리가 만들 첫 번째 우주 전투</Reveal>
 <Reveal delay={8} name="게임 제목" style={{fontSize:190,lineHeight:1.25,marginTop:25}}>우주 방어대</Reveal>
 <Reveal delay={23} style={{fontSize:64,color:'#bccde6',marginTop:25}}>움직이고. 조준하고. 지켜내세요.</Reveal>
 <Reveal delay={40} style={{fontSize:34,color:'#7c96b9',marginTop:80}}>최종 코드로 실행한 실제 게임 화면을 만나보세요</Reveal>
 </div>
 <CanvasImage src={staticFile('scout.png')} style={{position:'absolute',width:360,height:360,objectFit:'contain',right:150,top:400-f*.5,filter:'drop-shadow(0 0 45px #62e9ff66)'}}/>
 <AbsoluteFill style={{background:'#66f5ff',opacity:interpolate(f,[0,5],[.2,0],{extrapolateRight:'clamp'})}}/>
 </Background>;
};

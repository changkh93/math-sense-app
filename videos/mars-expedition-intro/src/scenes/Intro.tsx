import {CanvasImage,staticFile,useCurrentFrame} from 'remotion';
import {Background,Brand,Reveal,cyan,pink} from '../style';
export const Intro=()=>{
 const f=useCurrentFrame();
 return <Background><Brand/>
 <div style={{position:'absolute',left:80,top:220,width:1320}}>
 <Reveal style={{fontSize:46,color:pink,letterSpacing:3}}>이번 임무는, 붉은 행성에서.</Reveal>
 <Reveal delay={8} name="게임 제목" style={{fontSize:166,lineHeight:1.15,marginTop:32}}>화성 탐사대</Reveal>
 <Reveal delay={16} style={{fontSize:92,color:cyan,marginTop:4}}>신호 복구</Reveal>
 <Reveal delay={30} style={{fontSize:53,color:'#d7c9cf',marginTop:44}}>뛰어넘고. 로봇을 막고. 신호를 되찾으세요.</Reveal>
 <Reveal delay={45} style={{fontSize:32,color:'#b0a6b8',marginTop:55}}>최종 코드로 실행한 실제 게임을 만나보세요</Reveal>
 </div>
 <div style={{position:'absolute',right:125,top:320,width:380,height:380,borderRadius:'50%',border:'1px solid #ffb17d44',background:'radial-gradient(circle,#e9925833,transparent 70%)'}}/>
 <CanvasImage src={staticFile('explorer.png')} style={{position:'absolute',width:320,height:320,objectFit:'contain',imageRendering:'pixelated',right:160,top:350+Math.sin(f/30)*9}}/>
 </Background>;
};

import React from 'react';
import {AbsoluteFill,CanvasImage,Interactive,interpolate,staticFile,useCurrentFrame} from 'remotion';
import {loadFont} from '@remotion/fonts';
import {Video} from '@remotion/media';
loadFont({family:'DoHyeon',url:staticFile('DoHyeon-Regular.ttf'),weight:'400'});
export const C={cyan:'#00f3ff',purple:'#a78bfa',green:'#61ffaf',white:'#f4f7ff',muted:'#acbad4',orange:'#ffb47e'};
export const Back:React.FC<{children?:React.ReactNode;warm?:boolean}>=({children,warm=false})=>{const f=useCurrentFrame();return <AbsoluteFill style={{fontFamily:'DoHyeon',color:C.white,background:warm?'radial-gradient(ellipse at 90% 30%,#593144,#1a1432 50%,#080f21)':'radial-gradient(ellipse at 90% 30%,#29235b,#10162e 55%,#050a19)',overflow:'hidden'}}>
{Array.from({length:65},(_,i)=><div key={i} style={{position:'absolute',left:i*193%1080,top:(i*337+f*.5)%1920,width:i%8===0?4:2,height:i%8===0?4:2,background:i%2?C.cyan:'#fff',opacity:.15+(i%5)*.1,borderRadius:'50%'}}/>)}
<div style={{position:'absolute',width:1200,height:1200,right:-630,top:220,border:'2px solid #8871e42b',borderRadius:'50%',rotate:`${f/4}deg`}}/>
<div style={{position:'absolute',width:800,height:800,left:-600,top:1000,border:'2px solid #00f3ff22',borderRadius:'50%'}}/>
{children}</AbsoluteFill>};
export const Brand=()=> <div style={{position:'absolute',left:76,top:125,display:'flex',alignItems:'center',gap:16}}><CanvasImage src={staticFile('m-logo.svg')} style={{width:78,height:78}}/><div style={{fontSize:45,letterSpacing:2}}>메타센스<span style={{fontSize:26,color:C.muted,marginLeft:20}}>PYTHON</span></div></div>;
export const Pop:React.FC<{children:React.ReactNode;delay?:number;style?:React.CSSProperties;name?:string}>=({children,delay=0,style,name='자막'})=>{const f=useCurrentFrame()-delay;return <Interactive.Div name={name} style={{opacity:interpolate(f,[0,6],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'}),scale:interpolate(f,[0,7,12],[.90,1.025,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'}),translate:`0 ${interpolate(f,[0,10],[35,0],{extrapolateLeft:'clamp',extrapolateRight:'clamp'})}px`,...style}}>{children}</Interactive.Div>};
export const GameWindow=({game,start,top=650,width=920,left=60,tilt=0,volume=0}:{game:'space'|'mars';start:number;top?:number;width?:number;left?:number;tilt?:number;volume?:number})=>{
 const f=useCurrentFrame();const h=game==='space'?width*700/1200:width*736/1280;
 return <div style={{position:'absolute',left,top,width,height:h+42,rotate:`${tilt}deg`,scale:interpolate(f,[0,150],[.98,1.02],{extrapolateRight:'clamp'}),borderRadius:18,overflow:'hidden',border:`2px solid ${game==='space'?'#00f3ff99':'#ffb47eaa'}`,boxShadow:`0 15px 75px ${game==='space'?'#00d3ff22':'#ff886633'}`,background:'#090f20'}}>
 <div style={{height:42,padding:'4px 20px',fontSize:26,color:game==='space'?C.cyan:C.orange,display:'flex',justifyContent:'space-between'}}><span>{game==='space'?'우주 방어대':'화성 탐사대: 신호 복구'}</span><span style={{color:'#a9b5cc',fontSize:22}}>수업 완성 예제</span></div>
 <Video src={staticFile(`${game}.mp4`)} trimBefore={start*30} muted={volume===0} volume={volume} objectFit="contain" style={{width:'100%',height:h}}/>
 </div>;
};

import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, Interactive} from 'remotion';
import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';
loadFont({family:'DoHyeon',url:staticFile('DoHyeon-Regular.ttf'),weight:'400'});
export const cyan='#66f5ff'; export const pink='#ff7596';
export const Background:React.FC<{children?:React.ReactNode}>=({children})=>{
 const f=useCurrentFrame();
 return <AbsoluteFill style={{background:'radial-gradient(ellipse at 70% 20%, #14264c 0%, #080e20 55%, #040812 100%)',color:'#f5f8ff',fontFamily:'DoHyeon',overflow:'hidden'}}>
 {Array.from({length:65},(_,i)=><div key={i} style={{position:'absolute',left:(i*317%1920),top:(i*193+f*.10)%1080,width:i%9===0?3:2,height:i%9===0?3:2,borderRadius:'50%',background:'#b9d8ff',opacity:.15+.3*Math.sin(i+f/70)**2}}/>)}
 <div style={{position:'absolute',width:920,height:920,border:'1px solid #4bdce918',borderRadius:'50%',right:-360,top:-390}}/>
 {children}</AbsoluteFill>;
};
export const Reveal:React.FC<{children:React.ReactNode;delay?:number;style?:React.CSSProperties;name?:string}>=({children,delay=0,style,name='Text'})=>{
 const f=useCurrentFrame()-delay; const opacity=interpolate(f,[0,15],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'}); const y=interpolate(f,[0,20],[25,0],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
 return <Interactive.Div name={name} style={{opacity,translate:`0 ${y}px`,...style}}>{children}</Interactive.Div>;
};
export const Brand=()=> <div style={{position:'absolute',left:80,top:40,fontSize:26,letterSpacing:5,color:'#94aeca'}}>META SENSE <span style={{color:cyan}}> / GAME STUDIO</span></div>;

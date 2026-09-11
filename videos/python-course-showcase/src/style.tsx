import React from 'react';
import {AbsoluteFill,interpolate,staticFile,useCurrentFrame} from 'remotion';
import {loadFont} from '@remotion/fonts';
loadFont({family:'Do Hyeon',url:staticFile('DoHyeon-Regular.ttf'),weight:'400'});
export const Background:React.FC<{children:React.ReactNode;accent?:string}>=({children,accent='#7ff0cd'})=><AbsoluteFill style={{fontFamily:'Do Hyeon',color:'#f4f7ff',background:'radial-gradient(ellipse at 80% 20%,#162d48 0%,#080f1d 60%)',overflow:'hidden'}}><div style={{position:'absolute',inset:38,border:`1px solid ${accent}25`,borderRadius:30}}/>{children}</AbsoluteFill>;
export const Reveal:React.FC<{children:React.ReactNode;delay?:number;style?:React.CSSProperties}>=({children,delay=0,style={}})=>{const f=useCurrentFrame();const p=interpolate(f,[delay,delay+18],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});return <div style={{opacity:p,transform:`translateY(${(1-p)*20}px)`,...style}}>{children}</div>};
export const Brand=()=> <div style={{position:'absolute',left:88,top:70,fontSize:27,letterSpacing:5,color:'#7ff0cd'}}>METASENSE <span style={{color:'#9bb2ce',letterSpacing:3}}> / PYTHON</span></div>;

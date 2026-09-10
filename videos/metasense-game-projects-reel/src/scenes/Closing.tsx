import {CanvasImage,staticFile} from 'remotion';
import {Back,Pop,C} from '../design';
export const Closing=()=> <Back>
 <Pop style={{position:'absolute',top:220,left:100,width:790,textAlign:'center'}}><CanvasImage src={staticFile('m-logo.svg')} style={{width:220,height:220}}/></Pop>
 <Pop delay={5} style={{position:'absolute',top:485,left:80,width:830,textAlign:'center',fontSize:132}}>메타센스</Pop>
 <Pop delay={12} style={{position:'absolute',top:680,left:80,width:830,textAlign:'center',fontSize:53,color:C.muted}}>파이썬 프로그래밍</Pop>
 <Pop delay={18} style={{position:'absolute',top:765,left:80,width:830,textAlign:'center',fontSize:90,color:C.cyan}}>게임 프로젝트</Pop>
 <Pop delay={27} style={{position:'absolute',top:1020,left:80,width:830,textAlign:'center',fontSize:72,lineHeight:1.35}}>우리 아이의 첫 게임,<br/>여기서 시작하세요.</Pop>
 <Pop delay={40} style={{position:'absolute',top:1320,left:110,width:770,textAlign:'center',fontSize:77,color:C.green,border:'2px solid #61ffaf66',borderRadius:24,padding:'20px 0',background:'#61ffaf08'}}>msense.me</Pop>
 <Pop delay={49} style={{position:'absolute',top:1495,left:80,width:830,textAlign:'center',fontSize:42,color:C.muted}}>메타센스를 검색하세요</Pop>
 <Pop delay={49} style={{position:'absolute',top:1600,left:80,width:830,textAlign:'center',fontSize:25,lineHeight:1.5,color:C.muted}}>Music: Pixelland - Kevin MacLeod<br/>incompetech.com / CC BY 4.0 / excerpt</Pop>
 </Back>;

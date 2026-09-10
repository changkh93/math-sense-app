import {Sequence,staticFile,useCurrentFrame,interpolate} from 'remotion';
import {Video} from '@remotion/media';
import {Background,Brand,Reveal,cyan,pink} from '../style';
type Caption={from:number;to:number;title:string;label:string;hero:string;body:string;foot:string;color?:string};
const captions:Caption[]=[
 {from:0,to:4,title:'임무 시작. 우주를 지켜라!',label:'START',hero:'ENTER',body:'키를 누르면\n전투가 시작됩니다.',foot:'적 편대 55기 / 기체 5대'},
 {from:4,to:10,title:'좌우로 움직이며, 공격을 피하세요.',label:'MOVE',hero:'좌우 이동',body:'방향키로 탐사선을\n원하는 위치까지!',foot:'화면 밖으로 나가지 않아요'},
 {from:10,to:17,title:'빈틈을 노려, 레이저 발사!',label:'ATTACK',hero:'SPACE',body:'적을 맞히면\n한 기당 +100점',foot:'화면에 아군 탄환은 최대 2발'},
 {from:17,to:24,title:'적도 움직이고, 반격합니다.',label:'DEFEND',hero:'피하고\n조준하고',body:'벽에 닿은 적 편대는\n방향을 바꿔 내려옵니다.',foot:'빨간 방어선을 지켜주세요',color:pink},
 {from:24,to:29.77,title:'마지막 한 기까지 격파하세요.',label:'CLEAR',hero:'전부\n격파하면?',body:'1라운드 완료 보너스\n+1,000점!',foot:'적 격파 점수에 더해집니다'},
 {from:29.77,to:37.5,title:'다음 라운드, 더 빨라지는 적!',label:'NEXT ROUND',hero:'라운드 2',body:'Enter로 출발!\n편대가 더 빨리 움직이고\n더 많이 내려옵니다.',foot:'실력도, 도전도 한 단계 위로'},
];
const Panel=({c}:{c:Caption})=><div style={{position:'absolute',left:1430,top:240,width:420}}>
 <Reveal style={{fontSize:27,letterSpacing:5,color:c.color??cyan}}>{c.label}</Reveal>
 <Reveal delay={6} style={{fontSize:82,lineHeight:1.15,whiteSpace:'pre-line',marginTop:35,color:c.color??cyan}}>{c.hero}</Reveal>
 <Reveal delay={14} style={{fontSize:40,lineHeight:1.55,whiteSpace:'pre-line',marginTop:40}}>{c.body}</Reveal>
 <Reveal delay={24} style={{fontSize:29,lineHeight:1.5,color:'#97afcf',marginTop:48,borderTop:'2px solid #263959',paddingTop:25}}>{c.foot}</Reveal>
 </div>;
export const Gameplay=({mode='main'}:{mode?:'main'|'damage'|'over'})=>{
 const f=useCurrentFrame();
 const list=mode==='main'?captions:mode==='damage'?[
 {from:0,to:5,title:'맞으면 기체가 한 대 줄어듭니다.',label:'DAMAGE',hero:'5 → 4',body:'피격되면 잠시 대기.\nEnter로 다시 출발!',foot:'피격 상황을 별도로 플레이한 장면',color:pink}]:[
 {from:0,to:4,title:'기체를 모두 잃어도, 다시 도전!',label:'RESTART',hero:'다시 시작',body:'Enter를 누르면\n점수 0 / 기체 5대로\n새 게임이 시작됩니다.',foot:'도전할수록 조작이 익숙해져요',color:pink}];
 const current=list.find(c=>f>=c.from*30&&f<c.to*30)??list[list.length-1];
 return <Background><Brand/>
 <div style={{position:'absolute',left:80,top:100,fontSize:70,lineHeight:1.2}}>{current.title}</div>
 <div style={{position:'absolute',left:80,top:220,width:1300,height:758.333,overflow:'hidden',border:'2px solid #284565',borderRadius:12,boxShadow:'0 24px 65px #0008'}}>
 <Video src={staticFile(mode==='main'?'gameplay.mp4':'damage.mp4')} trimBefore={mode==='damage'?30:mode==='over'?405:0} style={{width:'100%',height:'100%'}} volume={.8}/>
 </div>
 {list.map((c,i)=><Sequence key={i} from={Math.round(c.from*30)} durationInFrames={Math.round(c.to*30)-Math.round(c.from*30)}><Panel c={c}/></Sequence>)}
 <div style={{position:'absolute',left:80,bottom:45,fontSize:24,letterSpacing:2,color:'#7894b8'}}>우주 방어대 / 최종 코드 실제 실행</div>
 <div style={{position:'absolute',left:1430,bottom:106,width:420,height:3,background:'#273750'}}><div style={{height:3,width:`${interpolate(f,[current.from*30,current.to*30],[0,100],{extrapolateRight:'clamp'})}%`,background:current.color??cyan}}/></div>
 </Background>;
};

import {Sequence,staticFile,useCurrentFrame,interpolate} from 'remotion';
import {Video} from '@remotion/media';
import {Background,Brand,Reveal,cyan,pink} from '../style';
type Caption={from:number;to:number;title:string;label:string;hero:string;body:string;foot:string;color?:string};
const captions:Caption[]=[
 {from:0,to:2,title:'신호를 잃은 화성 기지에 도착했습니다.',label:'MISSION START',hero:'ENTER',body:'키를 눌러\n탐사를 시작하세요.',foot:'한 번의 탐사는 30초'},
 {from:2,to:4.4,title:'발판을 딛고, 더 높이 뛰어오르세요.',label:'MOVE & JUMP',hero:'SPACE',body:'방향키로 이동\nSpace로 점프!',foot:'발판에 착지하며 길을 찾아요'},
 {from:4.4,to:8.8,title:'같은 색 이동문은 서로 연결됩니다.',label:'PORTAL',hero:'공간 이동',body:'이동문에 닿으면\n연결된 문으로 순간 이동!',foot:'기지의 위아래를 빠르게 오가요'},
 {from:8.8,to:16.2,title:'펄스로 쓰러뜨리고, 다가가 제거!',label:'ROBOT ENCOUNTER',hero:'위쪽 키 ↑',body:'펄스로 로봇을 쓰러뜨린 뒤\n접촉하면 +25점',foot:'그냥 두면 로봇이 다시 일어나요',color:pink},
 {from:16.2,to:22.2,title:'신호 결정을 회수해 에너지를 채우세요.',label:'COLLECT',hero:'+100점',body:'결정을 회수하면\n에너지도 +10 회복!',foot:'에너지는 최대 100까지',color:cyan},
 {from:22.2,to:27,title:'다가오는 로봇을 피해, 30초를 버티세요.',label:'SURVIVE',hero:'남은 시간',body:'시간이 흐르는 동안\n계속 나타나는 로봇!',foot:'살아남으면 이번 신호 복구 성공'},
 {from:27,to:32,title:'움직이는 로봇과 부딪히면 위험합니다.',label:'ENERGY',hero:'에너지 -20',body:'피격을 피하고\n신호 결정을 챙기세요.',foot:'에너지가 0이 되면 탐사가 끝나요',color:pink},
 {from:32,to:41,title:'신호 복구 성공! 다음 탐사를 시작하세요.',label:'SIGNAL RESTORED',hero:'다음 탐사',body:'Enter를 누르면\n새로운 탐사가 시작됩니다.',foot:'로봇 등장 간격이 더 짧아져요'},
];
const Panel=({c}:{c:Caption})=><div style={{position:'absolute',left:1430,top:240,width:420}}>
 <Reveal style={{fontSize:26,letterSpacing:3,color:c.color??cyan}}>{c.label}</Reveal>
 <Reveal delay={5} style={{fontSize:76,lineHeight:1.18,whiteSpace:'pre-line',marginTop:35,color:c.color??cyan}}>{c.hero}</Reveal>
 <Reveal delay={11} style={{fontSize:39,lineHeight:1.55,whiteSpace:'pre-line',marginTop:40,wordBreak:'keep-all'}}>{c.body}</Reveal>
 <Reveal delay={18} style={{fontSize:29,lineHeight:1.5,color:'#b3adc4',marginTop:45,borderTop:'2px solid #494051',paddingTop:25,wordBreak:'keep-all'}}>{c.foot}</Reveal>
 </div>;
export const Gameplay=({mode='main'}:{mode?:'main'|'over'})=>{
 const f=useCurrentFrame();
 const list:Caption[]=mode==='main'?captions:[{from:0,to:6,title:'탐사가 끝나도, 다시 도전할 수 있어요.',label:'TRY AGAIN',hero:'다시 출발',body:'Enter로 새 탐사!\n점수 0 / 에너지 100에서\n다시 시작합니다.',foot:'이후 탐사의 게임오버 / 재시작 장면',color:pink}];
 const current=list.find(c=>f>=c.from*30&&f<c.to*30)??list[list.length-1];
 return <Background><Brand/>
 <div style={{position:'absolute',left:80,top:100,fontSize:67,lineHeight:1.2}}>{current.title}</div>
 <div style={{position:'absolute',left:80,top:230,width:1300,height:747.5,overflow:'hidden',border:'2px solid #70514e',borderRadius:12,boxShadow:'0 24px 65px #0008'}}>
 <Video src={staticFile('gameplay.mp4')} trimBefore={mode==='over'?54*30:0} style={{width:'100%',height:'100%'}} volume={.85}/>
 </div>
 {list.map((c,i)=><Sequence key={i} from={Math.round(c.from*30)} durationInFrames={Math.round(c.to*30)-Math.round(c.from*30)}><Panel c={c}/></Sequence>)}
 <div style={{position:'absolute',left:80,bottom:45,fontSize:24,letterSpacing:2,color:'#b3a2b3'}}>화성 탐사대: 신호 복구 / 최종 코드 실제 실행</div>
 <div style={{position:'absolute',left:1430,bottom:106,width:420,height:3,background:'#494051'}}><div style={{height:3,width:`${interpolate(f,[current.from*30,current.to*30],[0,100],{extrapolateRight:'clamp'})}%`,background:current.color??cyan}}/></div>
 </Background>;
};

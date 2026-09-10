import {Background,Brand,Reveal,cyan} from '../style';
export const Outro=()=> <Background><Brand/>
 <div style={{position:'absolute',left:80,top:195,width:1760}}>
 <Reveal style={{fontSize:48,color:cyan}}>이제, 여러분이 만들 차례입니다.</Reveal>
 <Reveal delay={8} style={{fontSize:124,lineHeight:1.25,marginTop:28}}>이 움직임도, 이 규칙도<br/>여러분의 Python 코드로.</Reveal>
 <div style={{display:'flex',gap:28,marginTop:65}}>{['이동과 입력','발사와 충돌','점수와 라운드'].map((s,i)=><Reveal key={s} delay={28+i*10} style={{fontSize:44,padding:'22px 35px',border:'1px solid #305574',borderRadius:14,color:'#cfe8ff'}}>{s}</Reveal>)}</div>
 <Reveal delay={65} style={{fontSize:60,marginTop:60,color:cyan}}>메타센스 게임 스튜디오에서 시작하세요.</Reveal>
 <Reveal delay={80} style={{fontSize:34,marginTop:22,color:'#92accd'}}>Data Log로 원리를 이해하고, 직접 실행하며 완성합니다.</Reveal>
 </div></Background>;

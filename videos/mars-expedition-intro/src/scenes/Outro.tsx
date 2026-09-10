import {Background,Brand,Reveal,cyan,pink} from '../style';
export const Outro=()=> <Background><Brand/>
 <div style={{position:'absolute',left:80,top:195,width:1760}}>
 <Reveal style={{fontSize:48,color:pink}}>이번에는, 화성의 규칙을 직접 만듭니다.</Reveal>
 <Reveal delay={8} style={{fontSize:116,lineHeight:1.25,marginTop:28}}>점프하는 힘부터, 신호 복구까지.<br/>여러분의 Python 코드로.</Reveal>
 <div style={{display:'flex',gap:28,marginTop:65}}>{['타일과 중력','애니메이션과 충돌','점수와 게임 상태'].map((s,i)=><Reveal key={s} delay={25+i*9} style={{fontSize:43,padding:'22px 34px',border:'1px solid #61505a',borderRadius:14,color:'#e4d6db'}}>{s}</Reveal>)}</div>
 <Reveal delay={55} style={{fontSize:60,marginTop:60,color:cyan}}>메타센스 게임 스튜디오에서 시작하세요.</Reveal>
 <Reveal delay={70} style={{fontSize:34,marginTop:22,color:'#bcb2c8'}}>Data Log로 원리를 이해하고, 직접 실행하며 완성합니다.</Reveal>
 </div></Background>;

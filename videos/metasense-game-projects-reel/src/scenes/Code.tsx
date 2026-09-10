import {useCurrentFrame,interpolate} from 'remotion';
import {Back,Brand,Pop,GameWindow,C} from '../design';
export const Code=()=>{const f=useCurrentFrame();return <Back><Brand/>
 <Pop style={{position:'absolute',left:80,top:282,fontSize:104,lineHeight:1.2}}>이 움직임을<br/>만드는 건?</Pop>
 <Pop delay={12} style={{position:'absolute',left:80,top:565,fontSize:125,color:C.green}}>아이가 쓴 코드.</Pop>
 <div style={{position:'absolute',left:72,top:770,width:850,padding:'28px 30px',background:'#080e20',border:'2px solid #7a69cb',borderRadius:20}}>
 <div style={{fontSize:29,color:C.muted,marginBottom:26}}>화성 탐사대 실제 코드 일부</div>
 <div style={{fontFamily:'monospace',fontSize:27,lineHeight:1.9,whiteSpace:'pre',color:'#ddc7ff'}}>{'if self.grounded:'}</div>
 <div style={{fontFamily:'monospace',fontSize:27,lineHeight:1.9,whiteSpace:'pre',color:C.green,background:`rgba(0,255,136,${interpolate(f,[0,20,55,90],[0,.12,.12,0],{extrapolateRight:'clamp'})})`}}>{'    self.velocity.y = -self.jump_speed'}</div>
 </div>
 <GameWindow game="mars" start={2} top={1090} width={850} left={72}/>
 </Back>};

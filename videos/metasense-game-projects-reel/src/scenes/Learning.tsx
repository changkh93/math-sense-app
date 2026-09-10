import {Back,Brand,Pop,C} from '../design';
export const Learning=()=> <Back><Brand/>
 <Pop style={{position:'absolute',left:80,top:295,fontSize:103,lineHeight:1.24}}>원리를 이해하고,<br/><span style={{color:C.cyan}}>직접 실행하며</span><br/>완성하는 수업.</Pop>
 {[['01','이해','Data Log로 원리를 읽고',C.cyan],['02','구현','게임 스튜디오에서 코딩',C.purple],['03','실험','실행하고 바꾸며 확인',C.green]].map(([n,title,body,color],i)=><Pop key={n} delay={16+i*22} style={{position:'absolute',left:80,top:825+i*218,width:820,borderTop:`2px solid ${color}66`,paddingTop:25}}>
 <div style={{display:'flex',gap:25,alignItems:'baseline'}}><span style={{fontSize:38,color}}>{n}</span><span style={{fontSize:68,color}}>{title}</span></div>
 <div style={{fontSize:46,color:'#d5deef',marginTop:10,paddingLeft:68}}>{body}</div>
 </Pop>)}
 </Back>;

import {useCurrentFrame} from 'remotion';
import {Back,Brand,Pop,GameWindow,C} from '../design';
export const Project=({game}:{game:'space'|'mars'})=>{const mars=game==='mars';const f=useCurrentFrame();return <Back warm={mars}><Brand/>
 <Pop style={{position:'absolute',left:80,top:272,fontSize:34,color:mars?C.orange:C.cyan,letterSpacing:4}}>PROJECT {mars?'02':'01'} / 직접 만드는 게임</Pop>
 <Pop delay={5} style={{position:'absolute',left:80,top:350,fontSize:128,color:mars?C.orange:C.cyan}}>{mars?'화성 탐사대':'우주 방어대'}</Pop>
 <Pop delay={10} style={{position:'absolute',left:80,top:522,fontSize:55}}>Python으로 직접 구현합니다.</Pop>
 <GameWindow game={game} start={mars?13:9} top={660} volume={0}/>
 <Pop delay={17} style={{position:'absolute',left:80,top:1290,fontSize:mars?91:104,color:mars?C.orange:C.cyan}}>{mars?(f<70?'점프하고!':'신호를 되찾고!'):'쏘고! 피하고!'}</Pop>
 <Pop delay={28} style={{position:'absolute',left:80,top:1440,fontSize:47,color:'#d3ddf0',width:830}}>{mars?'중력과 충돌도 코드로 설계해요.':'이동, 발사, 점수 규칙을 내 손으로.'}</Pop>
 </Back>};

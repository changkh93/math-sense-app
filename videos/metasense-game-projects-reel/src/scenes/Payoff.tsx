import {Back,Brand,Pop,GameWindow,C} from '../design';
export const Payoff=()=> <Back><Brand/>
 <Pop style={{position:'absolute',left:80,top:340,fontSize:64}}>게임을 좋아하는 마음이</Pop>
 <Pop delay={8} style={{position:'absolute',left:80,top:460,fontSize:122,color:C.green,lineHeight:1.15}}>만드는<br/>힘으로.</Pop>
 <GameWindow game="space" start={33} top={850} width={820} left={78} tilt={-3}/>
 <Pop delay={22} style={{position:'absolute',left:80,top:1425,fontSize:54,color:C.cyan}}>메타센스 파이썬 게임 프로젝트</Pop>
 </Back>;

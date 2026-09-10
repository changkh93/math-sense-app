import {Back,Brand,Pop,GameWindow,C} from '../design';
export const Hook=()=> <Back><Brand/>
 <Pop style={{position:'absolute',left:80,top:275,fontSize:112,lineHeight:1.2}}>우리 아이가</Pop>
 <Pop delay={7} style={{position:'absolute',left:80,top:418,fontSize:128,color:C.cyan}}>이런 게임을</Pop>
 <Pop delay={16} style={{position:'absolute',left:80,top:572,fontSize:128}}>만든다고?</Pop>
 <GameWindow game="space" start={10} top={775} left={72} width={860} tilt={-4}/>
 <GameWindow game="mars" start={13} top={1100} left={110} width={790} tilt={4}/>
 </Back>;

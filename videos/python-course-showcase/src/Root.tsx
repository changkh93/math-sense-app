import {Composition} from 'remotion';
import {CourseFilm} from './Composition';
import {chapters,CourseId} from './data';
export const RemotionRoot=()=> <>{(Object.keys(chapters) as CourseId[]).map(id=><Composition key={id} id={id} component={CourseFilm} defaultProps={{id}} durationInFrames={1710} fps={30} width={1920} height={1080}/>)}</>;

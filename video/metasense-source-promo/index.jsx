import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile} from 'remotion';
import {IntroScene} from './IntroScene.jsx';
import {PlanetScene} from './PlanetScene.jsx';
import {LearningScene} from './LearningScene.jsx';
import {StreakScene} from './StreakScene.jsx';
import {CommunityScene} from './CommunityScene.jsx';
import {ParentScene} from './ParentScene.jsx';
import {OutroScene} from './OutroScene.jsx';

export const MetasenseSourceBrandFilm = () => (
  <AbsoluteFill style={{backgroundColor: '#050816'}}>
    <Audio src={staticFile('metasense-promo/docu-sfx/low-piano.wav')} volume={0.19} />
    <Sequence from={300}>
      <Audio src={staticFile('metasense-promo/docu-sfx/warm-strings.wav')} volume={0.17} />
    </Sequence>
    {[
      [30, 'vo-01-intro.wav'],
      [165, 'vo-02-planet.wav'],
      [390, 'vo-03-learning.wav'],
      [825, 'vo-04-streak.wav'],
      [990, 'vo-05-community.wav'],
      [1290, 'vo-06-parent.wav'],
      [1620, 'vo-07-outro.wav'],
    ].map(([from, file]) => (
      <Sequence key={file} from={from}>
        <Audio src={staticFile(`metasense-promo/${file}`)} volume={0.94} />
      </Sequence>
    ))}
    {[150, 360, 840, 960, 1260, 1620].map((from) => (
      <Sequence key={from} from={from} durationInFrames={15}>
        <Audio src={staticFile('metasense-promo/sfx/pop.wav')} volume={0.22} />
      </Sequence>
    ))}
    <Sequence from={0} durationInFrames={150} name="Hook">
      <IntroScene />
    </Sequence>
    <Sequence from={150} durationInFrames={210} name="Planet map">
      <PlanetScene />
    </Sequence>
    <Sequence from={360} durationInFrames={480} name="Learning flow">
      <LearningScene />
    </Sequence>
    <Sequence from={840} durationInFrames={120} name="Streak">
      <StreakScene />
    </Sequence>
    <Sequence from={960} durationInFrames={300} name="Crew and Agora">
      <CommunityScene />
    </Sequence>
    <Sequence from={1260} durationInFrames={360} name="Parent dashboard">
      <ParentScene />
    </Sequence>
    <Sequence from={1620} durationInFrames={180} name="Call to action">
      <OutroScene />
    </Sequence>
  </AbsoluteFill>
);

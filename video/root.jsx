import React from 'react';
import {Composition} from 'remotion';
import {MetasensePromo} from './metasense-promo.jsx';
import {MetasenseRemotePromo} from './metasense-remote-promo.jsx';
import {MetasenseDocuBrandFilm} from './metasense-docu-brand-film.jsx';
import {MetasenseSourceBrandFilm} from './metasense-source-promo/index.jsx';

export const Root = () => (
  <>
    <Composition
      id="MetasenseShort"
      component={MetasensePromo}
      durationInFrames={1260}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="MetasenseRemoteShort"
      component={MetasenseRemotePromo}
      durationInFrames={990}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="MetasenseDocuBrandFilm"
      component={MetasenseDocuBrandFilm}
      durationInFrames={2700}
      fps={30}
      width={1920}
      height={1080}
    />
    <Composition
      id="MetasenseSourceBrandFilm"
      component={MetasenseSourceBrandFilm}
      durationInFrames={1800}
      fps={30}
      width={1920}
      height={1080}
    />
  </>
);

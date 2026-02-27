import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import SpaceJourney from './src/components/Space/SpaceJourney.jsx';

// Mock dependencies
jest = {};
global.window = { innerWidth: 1000 };

const userData = {
  lastStreakDate: '2026-02-27',
  currentStreak: 2,
  streakFreezeCount: 2
};

try {
  const html = renderToString(createElement(SpaceJourney, { userData }));
  console.log("Render successful");
} catch (e) {
  console.error("Render failed:");
  console.error(e);
}

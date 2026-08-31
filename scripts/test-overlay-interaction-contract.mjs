import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const navbar = read('src/components/Space/SpaceNavbar.jsx');
const navbarCss = read('src/components/Space/SpaceNavbar.css');
const spaceHome = read('src/components/Space/SpaceHome.jsx');
const missionHub = read('src/components/Space/MissionHub.jsx');
const assignmentHub = read('src/components/Space/AssignmentHub.jsx');

assert.match(navbar, /import \{ createPortal \} from 'react-dom'/);
assert.match(navbar, /data-overlay="mobile-more-menu"/);
assert.match(navbar, /createPortal\([\s\S]*?data-overlay="mobile-more-menu"[\s\S]*?document\.body/);
assert.match(navbar, /exit=\{\{ opacity: 0, pointerEvents: 'none' \}\}/);
assert.match(navbarCss, /\.mobile-more-backdrop\s*\{[\s\S]*?z-index:\s*40000/);
assert.match(navbarCss, /\.mobile-more-sheet\s*\{[\s\S]*?z-index:\s*40001/);

assert.match(spaceHome, /import \{ createPortal \} from 'react-dom'/);
assert.match(spaceHome, /createPortal\([\s\S]*?data-overlay="completion-result"[\s\S]*?document\.body/);
assert.match(spaceHome, /data-overlay="completion-result"[\s\S]*?zIndex:\s*50000/);
assert.match(spaceHome, /data-overlay="completion-result"[\s\S]*?exit=\{\{ opacity: 0, pointerEvents: 'none' \}\}/);

for (const [name, source] of [
  ['SpaceHome', spaceHome],
  ['MissionHub', missionHub],
  ['AssignmentHub', assignmentHub],
]) {
  assert.doesNotMatch(source, /window\.innerWidth\s*<\s*768/, `${name} still uses a mismatched 768px boundary`);
  assert.match(source, /window\.innerWidth\s*<=\s*768/, `${name} must include the CSS 768px breakpoint`);
}

console.log('Overlay interaction contract checks passed.');

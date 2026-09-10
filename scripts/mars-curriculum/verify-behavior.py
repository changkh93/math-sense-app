import os
os.environ['SDL_VIDEODRIVER']='dummy'
os.environ['SDL_AUDIODRIVER']='dummy'
import pygame
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
os.chdir(ROOT/'public/mars-expedition')
code=(ROOT/'content/mars-expedition/checkpoints/final-main.py').read_text()
ns={};exec(code[:code.index('running = True')],ns)
m,e=ns['mission'],ns['explorer'];robots,pulses,crystals=ns['robots'],ns['pulses'],ns['crystals']
Robot,Crystal,Pulse=ns['Robot'],ns['Crystal'],ns['Pulse']
checks=[]
def check(name,condition):
 assert condition,name
 checks.append(name)
def fresh():
 m.reset_game();m.state='playing'
def robot_at(x,y,state='walking'):
 r=Robot(ns['platforms'],ns['gates'],2,7);r.position.update(x,y);r.rect.midbottom=r.position;r.previous_rect=r.rect.copy();r.state=state;robots.add(r);return r
fresh()
for _ in range(120):e.update(1/60)
check('Initial platform landing',e.grounded and e.rect.bottom==576 and e.velocity.y==0)
e.jump();check('Grounded jump',e.velocity.y==-18 and not e.grounded)
e.jump();check('No extra airborne jump',e.velocity.y==-18)
for _ in range(180):e.update(1/60)
check('Returns to a platform',e.grounded)
for gate in ns['gates']:
 e.portal_remaining=0;e.position.update(gate.rect.centerx,gate.rect.bottom);e.rect.midbottom=e.position;e.previous_rect=e.rect.copy();e.check_collisions()
 target=next(g for g in ns['gates'] if g is not gate and g.channel==gate.channel)
 expected=target.rect.centerx+(80 if target.rect.centerx<640 else -80)
 check(f'Portal {gate.channel} {gate.rect.centerx},{gate.rect.bottom}',e.position.x==expected and e.portal_remaining==0.4)
 before=e.position.copy();e.check_collisions();check('Portal lock prevents return',e.position==before)
fresh();e.position.x=-5;e.move(0);check('Horizontal wrap',e.position.x==1275)
# Controlled ceiling crossing: use a real platform at row8, keep previous head below it.
tile=next(t for t in ns['platforms'] if t.rect.top==256 and t.rect.left==384)
e.position.update(400,340);e.rect.midbottom=e.position;e.previous_rect=e.rect.copy();e.previous_rect.top=300;e.velocity.y=-10;e.check_collisions()
check('Ceiling resolves to underside',e.rect.top==tile.rect.bottom and e.velocity.y==0)
fresh();e.fire();e.fire();check('Fire cooldown',len(pulses)==1)
p=next(iter(pulses))
for _ in range(25):p.update(1/60)
check('Pulse expires after range',len(pulses)==0)
for action in ['run','idle','jump','fire']:
 e.animate(e.frames[(action,1)],0.15,8)
 expected=pygame.mask.from_surface(e.image)
 check('Current-frame mask '+action,e.mask.count()==expected.count() and e.mask.overlap_area(expected,(0,0))==expected.count())
fresh();r=robot_at(100,672)
r.state='falling';r.frame=0
for _ in range(40):r.check_animations(1/60)
check('Collapse holds down pose',r.state=='down')
for _ in range(121):r.check_animations(1/60)
check('Revival starts',r.state=='rising')
for _ in range(41):r.check_animations(1/60)
check('Revival returns walking',r.state=='walking')
# Controlled complete masks isolate rules from pose-dependent transparent pixels.
def solid(sprite):sprite.mask=pygame.mask.Mask(sprite.image.get_size(),fill=True)
fresh();solid(e);r=robot_at(e.rect.centerx,e.rect.bottom);solid(r);m.check_collisions()
check('Single contact damage and cooldown',e.health==80 and e.hurt_remaining==1)
r.position=e.position.copy();r.rect.midbottom=r.position;m.check_collisions()
check('Same contact cannot drain each frame',e.health==80)
fresh();solid(e);r=robot_at(e.rect.centerx,e.rect.bottom,'down');solid(r);m.check_collisions()
check('Down robot clear creates one crystal',m.score==25 and len(robots)==0 and len(crystals)==1)
m.check_collisions();check('No duplicate clear reward',m.score==25 and len(crystals)==1)
fresh();solid(e);e.health=85
for _ in range(2):
 c=Crystal(ns['platforms'],ns['gates']);c.rect.center=e.rect.center;solid(c);crystals.add(c)
m.check_collisions();check('Two crystals counted with health cap',m.score==200 and e.health==100 and len(crystals)==0)
fresh();r=robot_at(100,600);solid(r)
for _ in range(2):
 c=Crystal(ns['platforms'],ns['gates']);c.rect.center=r.rect.center;solid(c);crystals.add(c)
m.check_collisions();check('Enemy collects per-item and spawns two',len(robots)==3 and len(crystals)==0)
fresh();r=robot_at(100,600,'down');solid(r);c=Crystal(ns['platforms'],ns['gates']);c.rect.center=r.rect.center;solid(c);crystals.add(c);m.check_collisions()
check('Down robot cannot steal',len(crystals)==1 and len(robots)==1)
fresh()
for _ in range(300):m.add_robot(1/60)
check('One spawn exactly at 5 seconds',len(robots)==1)
m.add_robot(1/60);check('No duplicate on next frame',len(robots)==1)
for _ in range(599):m.add_robot(1/60)
check('Three spawns at 15 seconds',len(robots)==3)
fresh();solid(e);e.health=20;r=robot_at(e.rect.centerx,e.rect.bottom);solid(r);m.elapsed=30
c=Crystal(ns['platforms'],ns['gates']);c.rect.center=e.rect.center;solid(c);crystals.add(c)
m.update(1/60)
check('Death wins over timeout and same-frame healing',m.state=='game_over' and e.health==0 and m.score==0)
fresh();m.round_duration=0;m.update(1/60);check('Round clear transitions once',m.state=='round_clear' and m.round_number==1)
e.health=70;e.velocity.update(12,-8);m.start_new_round();check('Next round reset preserves health',m.round_number==2 and e.health==70 and e.velocity.length()==0 and not robots and m.spawn_interval==4)
for _ in range(10):m.start_new_round()
check('Spawn lower bound',m.spawn_interval==1)
m.round_duration=30;m.score=400;e.health=20;e.fire_remaining=2;e.portal_remaining=2;m.reset_game()
check('Full restart clears all transient state',m.score==0 and m.round_number==1 and e.health==100 and e.position==e.start and e.velocity.length()==0 and e.fire_remaining==0 and e.portal_remaining==0 and m.remaining==30)
pygame.quit()
print(f'PASS: {len(checks)} behavior checks')
(ROOT/'content/mars-expedition/behavior-checks.json').write_text(__import__('json').dumps({'checks':checks,'passed':len(checks)},ensure_ascii=False,indent=2)+'\n')

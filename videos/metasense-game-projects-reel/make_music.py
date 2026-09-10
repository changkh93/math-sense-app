"""Original 120 BPM arcade-pop cue, composed and synthesized for this reel.
No external recordings, samples, or melodies are used.
"""
from pathlib import Path
import numpy as np
import wave
SR=48000;DURATION=36;N=SR*DURATION;rng=np.random.default_rng(2910);mix=np.zeros((N,2),np.float64)
def add(a,start,gain=1,pan=0):
 i=round(start*SR);n=min(len(a),N-i)
 if i<0 or n<=0:return
 mix[i:i+n,0]+=a[:n]*gain*np.sqrt((1-pan)/2);mix[i:i+n,1]+=a[:n]*gain*np.sqrt((1+pan)/2)
def tone(midi,duration,kind='lead'):
 t=np.arange(round(duration*SR))/SR;freq=440*2**((midi-69)/12)
 if kind=='bass':waveform=np.sin(2*np.pi*freq*t)+.25*np.sin(4*np.pi*freq*t);env=np.minimum(t/.006,1)*np.exp(-t*7)
 elif kind=='pad':waveform=np.sin(2*np.pi*freq*t)+.3*np.sin(2*np.pi*freq*1.003*t);env=np.minimum(t/.06,1)*np.minimum((duration-t)/.12,1)*.7
 else:waveform=np.sin(2*np.pi*freq*t)+.28*np.sin(4*np.pi*freq*t)+.12*np.sin(6*np.pi*freq*t);env=np.minimum(t/.004,1)*np.exp(-t*12)*np.minimum((duration-t)/.02,1)
 return waveform*env
# E minor / C / G / D, re-voiced with a short original syncopated motif.
chords=[[52,55,59],[48,52,55],[43,47,50],[50,54,57]]
melody=[0,7,12,7,3,7,10,14,12,7,3,7,14,10,7,3]
for bar in range(18):
 base=bar*2;chord=chords[bar%4];quiet=14<=base<20
 for beat in range(4):
  t=np.arange(int(.32*SR))/SR
  kick=np.sin(2*np.pi*(44*t+22*.028*(1-np.exp(-t/.028))))*np.exp(-t*15)
  if not quiet or beat in [0,2]:add(kick,base+.5*beat,.44 if not quiet else .25)
  if beat in [1,3]:
   t=np.arange(int(.18*SR))/SR;n=rng.normal(0,1,len(t));sn=(n-np.roll(n,1))*.25*np.exp(-t*25)+np.sin(2*np.pi*180*t)*.25*np.exp(-t*28)
   add(sn,base+.5*beat,.35 if not quiet else .15)
  add(tone(chord[0]-12,.35,'bass'),base+.5*beat,.30 if not quiet else .16)
 for eighth in range(8):
  t=np.arange(int(.07*SR))/SR;n=rng.normal(0,1,len(t));hat=(n-np.roll(n,1))*np.exp(-t*70)
  add(hat,base+.25*eighth,.035 if eighth%2 else .024,(-1)**eighth*.3)
 for note in chord:add(tone(note+12,1.8,'pad'),base,.045,(-1)**note*.5)
 if not quiet:
  for step in [0,2,3,5,6,7]:
   interval=melody[(bar*3+step)%len(melody)]
   if interval==3:interval=chord[1]-chord[0]
   note=chord[0]+12+interval
   a=tone(note,.24);add(a,base+step*.25,.11,(-1)**step*.22);add(a,base+step*.25+.125,.025,-(-1)**step*.4)
# Section accents: quick rising noise sweeps and clean chimes.
for at in [4,9,14,20,26,30]:
 t=np.arange(round(.27*SR))/SR;n=rng.normal(0,1,len(t));n=np.convolve(n,np.ones(9)/9,mode='same');add(n*np.linspace(0,1,len(t))**2,at-.27,.18)
 for note in [76,83,88]:add(tone(note,.65),at,.13)
# A light delay gives the cue width without covering the game effects.
shift=int(.188*SR);mix[shift:,0]+=mix[:-shift,1].copy()*.09
fade=np.minimum(np.arange(N)/(.018*SR),1)*np.minimum((N-np.arange(N))/(.6*SR),1)
mix=np.tanh(mix*1.25)*fade[:,None];mix*=.82/max(.001,np.abs(mix).max())
p=Path(__file__).resolve().parent/'public/arcade-pop-original.wav'
with wave.open(str(p),'wb') as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes((mix*32767).astype('<i2').tobytes())
print(p)

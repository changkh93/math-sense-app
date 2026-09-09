from pathlib import Path
from PIL import Image,ImageOps,ImageDraw
import json
OUT=Path(__file__).parent
ROOT=Path('/var/folders/pn/jnf88cns4r9_lw3qvgp8jsyw0000gn/T')
SOURCES=[('9651e331-cb71-410e-b24b-aa8f4b956f8d',(1407,1792)),('ce9f4c30-7d7b-4746-851f-f2ba1dac0b00',(1308,1920)),('055cf0bd-7f07-4bba-bfa1-b0bbcbfce1d1',(1312,1863)),('1f39f86d-1a7d-4346-9fc3-5ab11c0fc3f8',(1298,1920)),('153e404b-af73-48bb-b1af-fc6d5023c16f',(1344,1832)),('8d0c1f10-a8ec-4869-8cbc-a17108e43411',(1279,1917)),('60fb2311-aae7-4a2b-a982-aceb9359cb0e',(1535,1601))]
# Coordinates refer to displayed source pages, scaled back to original pixels. Cropping only; no AI redrawing.
FIGURES={1:(0,(80,210,660,505)),3:(0,(185,1290,550,1565)),5:(0,(880,1025,1145,1335)),6:(1,(130,205,495,500)),9:(1,(770,175,1130,400)),10:(1,(670,1005,1240,1470)),11:(2,(120,125,505,360)),14:(2,(780,190,1070,455)),15:(2,(785,1085,1105,1340)),16:(3,(65,175,600,1110)),19:(3,(800,680,1090,925)),20:(3,(800,1295,1130,1515)),21:(4,(235,200,465,490)),22:(4,(100,810,615,1140)),23:(4,(185,1520,540,1805)),25:(4,(860,1060,1160,1350))}
REGIONS={
1:(0,(75,210,665,525)),2:(0,(75,735,665,1000)),3:(0,(75,1250,665,1695)),4:(0,(720,185,1310,480)),5:(0,(720,905,1310,1555)),
6:(1,(40,95,610,610)),7:(1,(40,875,610,1150)),8:(1,(40,1370,610,1650)),9:(1,(670,95,1240,625)),10:(1,(670,875,1240,1605)),
11:(2,(55,80,610,480)),12:(2,(55,750,610,950)),13:(2,(55,1165,610,1570)),14:(2,(665,80,1240,635)),15:(2,(665,990,1240,1545)),
16:(3,(65,80,625,1120)),17:(3,(65,1200,625,1725)),18:(3,(685,80,1245,510)),19:(3,(685,610,1245,1070)),20:(3,(685,1240,1245,1700)),
21:(4,(55,105,655,500)),22:(4,(55,770,655,1160)),23:(4,(55,1395,655,1815)),24:(4,(715,115,1320,245)),25:(4,(715,975,1320,1365))}
manifest=[]
def crop(page,box,name):
 token,(dw,dh)=SOURCES[page]; src=ROOT/f'codex-clipboard-{token}.png'
 im=Image.open(src).convert('RGB'); w,h=im.size
 px=tuple(round(v*(w/dw if k%2==0 else h/dh)) for k,v in enumerate(box))
 dest=OUT/'assets'/name
 im.crop(px).save(dest,optimize=True)
 manifest.append({'file':str(dest.relative_to(OUT)),'source':str(src),'sourcePage':page+1,'cropPixels':px,'size':Image.open(dest).size})
for n,(p,b) in FIGURES.items(): crop(p,b,f'q{n:02d}.png')
for n,(p,b) in REGIONS.items(): crop(p,b,f'source-q{n:02d}.png')
for i in [5,6]:
 token,_=SOURCES[i]; Image.open(ROOT/f'codex-clipboard-{token}.png').save(OUT/'assets'/f'answer-page-{i+1}.png')
(OUT/'assets-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
thumbs=[]
for n in FIGURES:
 im=Image.open(OUT/'assets'/f'q{n:02d}.png'); im.thumbnail((300,330))
 tile=Image.new('RGB',(320,370),'#eeeeee'); tile.paste(im,((320-im.width)//2,30)); ImageDraw.Draw(tile).text((10,10),f'Q{n:02d}',fill='black'); thumbs.append(tile)
contact=Image.new('RGB',(1280,370*((len(thumbs)+3)//4)),'white')
for i,im in enumerate(thumbs):contact.paste(im,((i%4)*320,(i//4)*370))
contact.save(OUT/'crop-contact-sheet.png')
print('Cropped',len(FIGURES),'figures and',len(REGIONS),'source questions')

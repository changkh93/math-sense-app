from pathlib import Path
import json,fitz
from PIL import Image,ImageDraw
B=Path(__file__).parent
# page, column (0/1), top, bottom in inspected 952x1347 preview
REG={
1:[(1,0,322,710),(1,0,748,1200),(1,1,232,554),(1,1,632,1093),(2,0,82,392),(2,0,454,703),(2,0,771,1185),(2,1,180,432),(2,1,624,919),(3,0,85,389),(3,0,490,727),(3,0,860,1084),(3,1,80,349),(3,1,495,763),(3,1,898,1125),(4,0,83,355),(4,0,447,832),(4,0,930,1217),(4,1,83,354),(4,1,638,894)],
2:[(1,0,323,684),(1,0,835,1085),(1,1,256,581),(1,1,619,896),(1,1,924,1209),(2,0,82,363),(2,0,543,866),(2,1,205,514),(2,1,613,848),(2,1,902,1205),(3,0,87,354),(3,0,527,853),(3,0,945,1195),(3,1,90,332),(3,1,457,1002),(4,0,83,310),(4,0,456,856),(4,0,987,1215),(4,1,88,326),(4,1,570,769)],
3:[(1,0,337,666),(1,0,731,1229),(1,1,278,487),(1,1,628,1203),(2,0,84,360),(2,0,494,886),(2,1,97,553),(2,1,839,1088),(3,0,91,400),(3,0,545,778),(3,0,910,1174),(3,1,94,415),(3,1,660,911),(4,0,83,314),(4,0,571,851),(4,1,86,291),(4,1,576,840),(5,0,76,301),(5,0,519,894),(5,1,86,370)],
4:[(1,0,330,810),(1,0,856,1250),(1,1,253,689),(1,1,721,1240),(2,0,79,494),(2,0,554,1176),(2,1,79,685),(2,1,694,1164),(3,0,223,575),(3,0,728,1032),(3,1,76,315),(3,1,472,772),(3,1,878,1159),(4,0,85,326),(4,0,682,921),(4,1,86,414),(4,1,633,928),(5,0,79,400),(5,0,627,968),(5,1,104,600)]}
for r in range(1,5):
 dest=B/f'authoring/round{r}';doc=fitz.open(B/f'sources/round{r}/source.pdf');manifest=json.loads((dest/'manifest.json').read_text())
 for m,(p,col,y0,y1) in zip(manifest['questions'],REG[r]):
  x0,x1=(54,472) if col==0 else (481,893)
  f=f"assets/source-q{m['number']:02}.png";doc[p-1].get_pixmap(matrix=fitz.Matrix(2,2),clip=fitz.Rect(x0/1.6,y0/1.6,x1/1.6,y1/1.6)).save(str(dest/f));m['sourcePage']=p;m['sourceImagePath']=f
 (dest/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
 pics=[(m['number'],dest/m['imagePath']) for m in manifest['questions'] if m['imagePath']]
 for start in range(0,len(pics),9):
  chunk=pics[start:start+9];sheet=Image.new('RGB',(1350,1440),'#eee');dr=ImageDraw.Draw(sheet)
  for idx,(n,p) in enumerate(chunk):
   im=Image.open(p).convert('RGB');im.thumbnail((428,432));x=idx%3*450;y=idx//3*480;sheet.paste(im,(x+(450-im.width)//2,y+35));dr.text((x+15,y+6),f'Round {r} Q{n}',fill='black')
  sheet.save(B/f'qa-round{r}-{start//9+1}.png')
 print(r,'source crops',20,'images',len(pics))

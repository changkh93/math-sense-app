from pathlib import Path
import html,re
root=Path(__file__).resolve().parents[2]/'public/mars-expedition'
lines=(root/'ASSETS.md').read_text().splitlines();parts=[];table=False
for line in lines:
 if line.startswith('|'):
  if re.match(r'^\|[ :|\-]+$',line):continue
  if not table:parts.append('<table>');table=True;tag='th'
  else:tag='td'
  parts.append('<tr>'+''.join(f'<{tag}>{html.escape(cell.strip())}</{tag}>' for cell in line.strip('|').split('|'))+'</tr>');continue
 if table:parts.append('</table>');table=False
 if not line:continue
 if line.startswith('# '):parts.append('<h1>'+html.escape(line[2:])+'</h1>')
 elif line.startswith('## '):parts.append('<h2>'+html.escape(line[3:])+'</h2>')
 else:parts.append('<p>'+re.sub(r'\*\*(.*?)\*\*',r'<strong>\1</strong>',html.escape(line))+'</p>')
(root/'ASSETS.html').write_text('<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>화성 탐사대 에셋 안내</title><style>body{margin:0;background:#101827;color:#e9f0fa;font:17px/1.85 system-ui,sans-serif}main{max-width:960px;margin:auto;padding:32px 20px}h1,h2{color:#78dfd4}table{border-collapse:collapse;width:100%;font-size:14px}td,th{border:1px solid #425069;padding:10px;text-align:left;overflow-wrap:anywhere}a{color:#8ce6db}</style><main><a href="/python-game-studio">게임 스튜디오 열기</a>'+''.join(parts)+'</main></html>')

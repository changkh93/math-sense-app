import json
from pathlib import Path
from html import escape
root=Path('docs/collaboration/tasks/20260910-smartstore-growth/odyssey')
lectures=json.loads((root/'lectures.json').read_text())
P='margin:0 0 20px;padding:0;font-size:18px;line-height:1.9;letter-spacing:0;word-break:keep-all;overflow-wrap:break-word;color:#294448;'
S='margin:0;padding:0;font-size:15px;line-height:1.8;word-break:keep-all;color:#627476;'
H='margin:0 0 24px;padding:0;font-size:27px;line-height:1.5;letter-spacing:-0.5px;word-break:keep-all;color:#173d40;'
def p(t):return f'<p style="{P}">{t}</p>'
def gap(h=40):return f'<div style="height:{h}px;line-height:{h}px;font-size:1px;" aria-hidden="true">&nbsp;</div>'
def section(n,title,body,bg='#ffffff'):
 return f'<div style="background:{bg};padding:36px 24px;"><p style="{S}font-weight:bold;letter-spacing:2px;color:#937750;">{n}</p>{gap(12)}<h2 style="{H}">{title}</h2>{body}</div>'
def card(title,body):
 return f'<div style="border:1px solid #d7e2dc;background:#fff;padding:24px;margin:0 0 16px;"><p style="{P}font-size:21px;font-weight:bold;margin-bottom:12px;">{title}</p><p style="{P}margin-bottom:0;">{body}</p></div>'
parts=['<div style="max-width:760px;width:100%;margin:0 auto;padding:0;background:#ffffff;font-family:Arial,\'Malgun Gothic\',\'Apple SD Gothic Neo\',sans-serif;text-align:left;box-sizing:border-box;">']
parts.append('<div style="background:#173d40;padding:48px 24px;text-align:center;">'+f'<p style="{S}color:#d9d0b9;letter-spacing:3px;">둘시네 · 서양고전 강독</p>'+gap(24)+'<h1 style="margin:0;padding:0;font-size:36px;line-height:1.5;letter-spacing:-1px;color:#ffffff;">호메로스<br>오뒷세이아</h1>'+gap(20)+f'<p style="{P}color:#ffffff;margin:0;">영화에서 시작된 궁금증을<br>원작 한 권의 깊이로.</p>'+gap(28)+f'<p style="{S}color:#e4e9e4;">원작 1~24권을 따라가는<br>녹화 영상 강독 수업</p></div>')
parts.append('<table role="presentation" cellpadding="16" cellspacing="0" style="width:100%;table-layout:fixed;border-collapse:collapse;background:#f3f0e8;text-align:center;"><tbody><tr>'+''.join(f'<td style="width:33.33%;padding:24px 4px;vertical-align:top;border-right:1px solid #deded3;"><p style="margin:0;font-size:23px;line-height:1.5;font-weight:bold;color:#173d40;">{a}</p><p style="margin:8px 0 0;font-size:14px;line-height:1.7;color:#526b69;">{b}</p></td>' for a,b in [('18강','전편 강독'),('평생','반복 시청'),('26쪽','PDF 워크북')])+'</tr></tbody></table>')
parts.append(gap(20))
parts.append(section('01 · 강좌 소개','읽고, 듣고, 기록하며<br>원작을 끝까지 만나세요.',p('호메로스의 『오뒷세이아』를<br>처음부터 끝까지 따라가는 영상강좌입니다.')+p('영화 오디세이를 계기로 원작이 궁금해졌다면,<br>이제 문장과 인물의 선택을 천천히 살펴보세요.')+p('한 번에 모두 들을 필요는 없습니다.<br>읽을 범위를 정하고, 강의를 듣고,<br>워크북에 자신의 생각을 남겨 보세요.')+f'<p style="{S}">강의: 장기홍 &nbsp; / &nbsp; 제공: 둘시네<br>총 재생 시간: 35시간 21분 15초</p>'))
parts.append(gap(20))
parts.append(section('02 · 제공 구성','구매하면 이렇게 받습니다.',card('① 녹화 영상 18강','원작 1~24권을 따라가는 강독입니다.<br>자신의 속도로, 평생 반복해서 시청하세요.')+card('② 원작 읽기 워크북 PDF','총 26쪽의 읽기 보조자료입니다.<br>질문 36개와 기록란으로 생각을 정리하세요.')+gap(8)+f'<p style="{P}font-weight:bold;margin:0;">구매 후 1일 이내<br>영상 이용 안내와 PDF를 이메일로 보내드립니다.</p>','#f4f7f3'))
parts.append(gap(32))
parts.append(section('03 · 워크북 활용','듣는 데서 한 걸음 더,<br>생각을 글로 남기세요.',p('18강의 읽을 범위와 재생 시간부터<br>인물 관계와 서사 구조, 읽기 질문까지.<br>강의 곁에 두고 활용할 수 있도록 구성했습니다.')+card('강의 전에 · 읽을 범위 확인','목차에서 해당 강의의 범위를 확인하고<br>그 부분을 먼저 읽어 보세요.')+card('강의를 들으며 · 근거 기록','인상적인 대목과 영상 시각을 적고,<br>본문에서 생각의 근거를 찾아보세요.')+card('강의 후에 · 나의 해석 정리','질문에 자신의 말로 답해 보세요.<br>영화를 보았다면 원작과 비교할 수도 있습니다.')+f'<p style="{S}">워크북은 원작을 참고해 독립적으로 작성한 읽기 보조자료입니다.<br>강의 녹취록이나 정답집이 아니며, 주요 사건과 결말이 포함됩니다.</p>'))
parts.append('<div style="padding:0 24px 24px;"><img src="https://shop1.phinf.naver.net/20260910_135/1789019240694x3sO5_PNG/139963109628838636_2007629579.png" alt="오뒷세이아 PDF 워크북 구성 안내" style="display:block;width:100%;max-width:712px;height:auto;margin:0 auto;border:0;" /></div>')
parts.append(gap(32))
body=p('원작의 권·행 번호를 기준으로<br>필요한 강의를 쉽게 찾아보세요.')
for group in range(3):
 body+=f'<h3 style="margin:28px 0 14px;padding:0;font-size:21px;line-height:1.6;color:#173d40;">{group*6+1:02d}–{group*6+6:02d}강</h3>'
 body+='<table cellpadding="12" cellspacing="0" style="width:100%;border-collapse:collapse;table-layout:fixed;"><thead><tr><th style="width:40px;padding:12px 4px;background:#e5ece6;font-size:14px;line-height:1.6;text-align:left;">강의</th><th style="padding:12px 8px;background:#e5ece6;font-size:14px;line-height:1.6;text-align:left;">읽을 범위</th><th style="width:64px;padding:12px 4px;background:#e5ece6;font-size:14px;line-height:1.6;text-align:right;">재생 시간</th></tr></thead><tbody>'
 for l in lectures[group*6:group*6+6]:
  r=l['range'].replace(' ~ ','<br>~ ')
  body+=f'<tr><td style="padding:16px 4px;border-bottom:1px solid #dbe2dc;vertical-align:top;font-size:15px;line-height:1.8;color:#173d40;font-weight:bold;">{l["n"]:02d}강</td><td style="padding:16px 8px;border-bottom:1px solid #dbe2dc;vertical-align:top;font-size:16px;line-height:1.8;color:#294448;">{r}</td><td style="padding:16px 4px;border-bottom:1px solid #dbe2dc;vertical-align:top;font-size:14px;line-height:1.8;text-align:right;color:#526b69;">{l["time"]}</td></tr>'
 body+='</tbody></table>'+gap(12)
body+=f'<p style="{S}">‘24권’은 작품 안의 구성 단위입니다.<br>종이책 24권을 제공한다는 뜻이 아닙니다.</p>'
parts.append(section('04 · 전체 커리큘럼','18강, 처음부터 끝까지.',body,'#fbfaf6'))
parts.append(gap(32))
parts.append(section('05 · 수강 준비','교재는 별도로 준비해 주세요.',p('<strong>『오뒷세이아』</strong><br>호메로스 지음 · 천병희 옮김<br>도서출판 숲')+p('이 상품은 온라인 영상강좌와 PDF 자료입니다.<br>종이책과 인쇄된 워크북은 포함되지 않습니다.')+f'<p style="{S}">인터넷 연결과 YouTube 영상을 재생할 수 있는 기기가 필요합니다.<br>영화 영상이나 영화 관람권은 제공하지 않습니다.</p>'))
parts.append(gap(20))
parts.append(section('06 · 이메일 발송','구매 후 이용하는 방법',card('1. 이메일 주소를 남겨주세요.','주문 시 기타메모에<br>안내를 받을 이메일 주소를 적어주세요.')+card('2. 구매 후 1일 이내 발송합니다.','영상 이용 안내와 PDF 워크북을<br>이메일로 보내드립니다.')+card('3. 자신의 속도로 시청하세요.','영상은 평생 시청할 수 있습니다.<br>필요한 대목을 다시 보며 활용하세요.')+f'<p style="{S}">1일이 지나도 메일이 오지 않으면 스팸함을 확인해 주세요.<br>메일 미수신, 영상 접근 오류, 자료 누락은 스토어 문의로 알려주세요.</p>','#f4f7f3'))
parts.append(gap(28))
parts.append(section('07 · 구매 전 확인','취소·환불 안내',p('주문 취소·환불은 디지털콘텐츠 제공 여부와<br>관련 법령, 네이버 스마트스토어 기준에 따라 처리합니다.')+f'<p style="{S}">상품 설명과 다르게 제공되거나 콘텐츠에 하자가 있는 경우에도<br>스토어 문의로 알려주세요.</p>'))
parts.append(gap(24)+'<div style="background:#173d40;padding:36px 24px;text-align:center;">'+f'<p style="{P}color:#ffffff;margin:0;">작품을 읽는 시간을,<br>자신의 생각을 만드는 시간으로.</p>'+gap(16)+f'<p style="{S}color:#d9d0b9;">둘시네 · 호메로스 오뒷세이아 강독</p></div></div>')
html='\n'.join(parts)
(root/'DETAIL-V2.html').write_text(html)
(root/'DETAIL-V2-preview.html').write_text('<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>오뒷세이아 상세 개편</title><style>body{margin:0;background:#eee}p,h1,h2,h3{margin:0}*{box-sizing:border-box}</style>'+html+'</html>')
print('Created DETAIL-V2.html:',len(html),'characters; 18 lecture rows.')

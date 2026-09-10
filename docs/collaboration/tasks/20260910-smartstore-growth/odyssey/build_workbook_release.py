from pathlib import Path
import json, math
from xml.sax.saxutils import escape
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor, Color
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle

ROOT=Path(__file__).resolve().parents[5]
DATA=json.loads(Path(__file__).with_name('lectures.json').read_text())
OUT=ROOT/'output/pdf/odyssey-reading-workbook.pdf'
OUT.parent.mkdir(parents=True,exist_ok=True)
pdfmetrics.registerFont(TTFont('Body','/System/Library/Fonts/Supplemental/Arial Unicode.ttf'))
pdfmetrics.registerFont(TTFont('Title',str(ROOT/'public/space-invaders/assets/DoHyeon-Regular.ttf')))
W,H=595.28,841.89
INK=HexColor('#18383B'); TEAL=HexColor('#347D7C'); GOLD=HexColor('#B38341')
MUTED=HexColor('#637578'); LINE=HexColor('#D5DEDC'); PAPER=HexColor('#FCFAF5')
C=canvas.Canvas(str(OUT),pagesize=(W,H))
C.setTitle('오뒷세이아 원작 읽기 워크북 - 18강 원작 읽기 보조자료')
C.setAuthor('둘시네')
page=0

def text(s,x,y,size=11,font='Body',color=INK):
    C.setFillColor(color); C.setFont(font,size); C.drawString(x,y,s)

def para(s,x,y,width=499,size=11,leading=18,color=INK,font='Body'):
    p=Paragraph(escape(s).replace('\n','<br/>'),ParagraphStyle('p',fontName=font,fontSize=size,leading=leading,textColor=color,wordWrap='CJK'))
    _,h=p.wrap(width,700)
    p.drawOn(C,x,y-h)
    return y-h

def lines(y,n=3):
    C.setStrokeColor(LINE); C.setLineWidth(.6)
    for k in range(n):C.line(48,y-k*23,547,y-k*23)

def base(kicker,title,sub=''):
    global page
    page+=1
    C.setFillColor(PAPER);C.rect(0,0,W,H,fill=1,stroke=0)
    C.setStrokeColor(TEAL);C.setLineWidth(3);C.line(48,H-48,88,H-48)
    text(kicker.upper(),100,H-52,9,'Body',TEAL)
    text(title,48,H-99,26,'Title')
    if sub:para(sub,48,H-118,size=10,color=MUTED,leading=16)
    C.setStrokeColor(LINE);C.setLineWidth(.5);C.line(48,48,547,48)
    text('둘시네 | 오뒷세이아 원작 읽기 | 2026.09',48,31,8,color=MUTED)
    C.setFont('Body',9);C.drawRightString(547,31,f'{page:02}')

def label(s,y):text(s,48,y,12,'Title',TEAL)
def finish():C.showPage()

base('READ HOMER / 18 LECTURES','오뒷세이아','원작 24권을 따라가는 읽기 워크북')
text('영화에서 시작된 궁금증을',48,626,23,'Title')
text('내 문장으로 읽어 내는 시간',48,590,23,'Title')
for i in range(6):
    C.setStrokeColor(Color(.2,.49,.48,alpha=.25+i*.08));C.setLineWidth(1)
    p=C.beginPath();p.moveTo(48,430+i*17)
    p.curveTo(180,490+i*17,330,360+i*17,547,436+i*17);C.drawPath(p)
C.setFillColor(INK);C.roundRect(48,276,499,97,10,fill=1,stroke=0)
text('18강',69,332,27,'Title',PAPER)
text('35시간 21분 15초',245,332,25,'Title',PAPER)
text('1권부터 24권까지',70,303,11,color=PAPER)
text('제공된 영상 목록의 재생 시간 합계',245,303,10,color=PAPER)
para('인물과 사건의 구조를 잡고, 강의를 들으며 근거를 남기고, 읽은 뒤 자기 해석을 완성합니다.',48,228,size=13,leading=21)
para('호메로스 원작의 흐름을 따라 읽고 기록하는 수강 보조자료입니다. 질문과 관점은 독립적으로 구성했으며, 강의의 발언을 옮긴 녹취록이 아닙니다.',48,143,size=10,color=MUTED,leading=17)
finish()

base('HOW TO USE','이 워크북을 쓰는 순서','줄거리를 확인하는 읽기에서, 근거를 비교하는 읽기로')
y=664
for a,b in [
('01  먼저 읽기','해당 강의 범위를 책에서 읽습니다. 이해되지 않는 인물 이름이나 말 한 대목을 표시합니다. 판본마다 쪽수가 다르므로 권·행 번호를 우선 적습니다.'),
('02  들으며 확인하기','강의의 설명과 본문을 나란히 보며 중요한 근거를 기록합니다. 영상 시간과 권·행을 함께 남겨 두면 다시 찾기 쉽습니다.'),
('03  멈추고 생각하기','각 강의 질문 중 하나를 고릅니다. 먼저 내 생각을 한 문장으로 쓰고, 그것을 지지하거나 흔드는 대목을 찾습니다.'),
('04  읽은 뒤 고쳐 쓰기','처음 쓴 문장을 다시 읽고 고칩니다. 강사의 해석, 본문에 적힌 사실, 내 해석을 서로 구분합니다.')]:
    label(a,y); y=para(b,48,y-16,size=11)-36
label('기록 예시',y)
y=para('장면: 14권의 에우마이오스가 낯선 손님을 맞는 대목\n관찰: 손님의 정체를 확인하기 전에 먹을 것과 쉴 곳을 제공한다.\n질문: 이 행동은 이타케 구혼자들의 태도와 어떻게 대비되는가?\n근거 위치: 내 판본의 권·행 / 영상 시각을 직접 기록한다.',48,y-18,size=11)-28
label('자료의 범위',y)
para('본문 줄거리와 질문은 호메로스 원작을 참고해 새로 작성했습니다. 강의별 권·행 범위와 시간은 제공된 재생목록을 따릅니다. 질문의 답을 하나로 고정하지 않습니다. 이 자료에는 주요 사건과 결말이 포함됩니다.',48,y-18,size=10,color=MUTED)
finish()

for offset in (0,9):
    base('COURSE INDEX',f'강의 목차 {1 if offset==0 else 2} / 2','영상 표시는 18강이며, 모두 합하면 35시간 21분 15초입니다.')
    y=665
    text('강',48,y,10,color=TEAL);text('읽을 범위 / 워크북의 읽기 주제',92,y,10,color=TEAL);text('재생 시간',468,y,10,color=TEAL)
    for d in DATA[offset:offset+9]:
        y-=58
        text(f"{d['n']:02}",48,y,18,'Title',GOLD)
        text(d['range'],92,y+3,11)
        text(d['focus'],92,y-16,10,color=MUTED)
        text(d['time'],468,y+1,10)
        C.setStrokeColor(LINE);C.line(48,y-28,547,y-28)
    para('범위의 “권”은 작품의 24개 구분을 뜻합니다. 종이책 24권을 구매한다는 뜻이 아닙니다. 화면의 행 번호를 옮겼으므로 사용하는 번역본과 강의에서 다시 확인합니다.',48,95,size=9,leading=14,color=MUTED)
    finish()

base('STORY STRUCTURE','시간의 순서와 이야기의 순서','9~12권의 항해담은 오뒷세우스가 지난 일을 돌아보며 말하는 부분입니다.')
y=667
for r,t,b in [('1~4권','아들을 먼저 따라간다','텔레마코스의 여행과 이타케의 위기를 통해 부재한 아버지의 모습을 듣는다.'),('5~8권','귀환자의 현재를 만난다','칼륍소의 섬을 떠나 파이아케스 사람들에게 도착하고, 손님의 정체가 질문이 된다.'),('9~12권','지난 항해를 듣는다','오뒷세우스가 자신의 목소리로 트로이 이후 겪은 일을 회상한다.'),('13~24권','집에 돌아온 뒤의 문제를 읽는다','이타케 도착, 정체의 숨김과 알아봄, 대결, 가족의 재회와 공동체의 갈등이 이어진다.')]:
    C.setFillColor(HexColor('#EDF2EC'));C.roundRect(48,y-98,499,95,7,fill=1,stroke=0)
    text(r,64,y-26,16,'Title',TEAL);text(t,146,y-26,15,'Title')
    para(b,146,y-40,width=379,size=10,leading=16)
    y-=117
label('순서를 바꾸면 무엇이 달라질까?',y-5)
para('트로이를 떠나는 장면부터 시간순으로 시작한다고 가정해 보세요. 현재 작품의 시작과 비교해, 텔레마코스와 페넬로페를 이해하는 방식이 어떻게 달라질지 적어 봅니다.',48,y-23,size=11)
lines(110,2);finish()

base('CHARACTERS','인물은 관계로 기억한다','이름을 외우기보다, 서로 무엇을 알고 무엇을 원하는지 표시해 보세요.')
rows=[('오뒷세우스','이타케의 왕, 페넬로페의 남편, 텔레마코스의 아버지. 귀환 과정에서 정체를 숨기거나 드러낸다.'),('페넬로페','이타케에 남아 집과 관계를 지킨다. 기다림뿐 아니라 판단·질문·시험의 주체로 읽는다.'),('텔레마코스','부재한 아버지의 소식을 찾아 나서는 아들. 공적인 발언과 행동을 배우는 과정에 주목한다.'),('아테나 / 포세이돈','귀환을 돕는 신과 가로막는 신. 신의 개입과 인간의 책임을 따로 기록한다.'),('칼륍소 / 키르케','항해의 서로 다른 국면에 등장한다. 각각 무엇을 붙잡고 무엇을 알려 주는지 비교한다.'),('나우시카아 / 알키노오스 / 아레테','파이아케스 사회에서 손님을 맞는 인물들. 도움을 구하는 방식과 환대의 절차를 살핀다.'),('에우마이오스 / 에우뤼클레이아','집을 지키는 사람들. 낯선 손님을 돌보는 행동과 오래된 흔적을 알아보는 기억에 주목한다.'),('구혼자들','같은 집에 모였어도 모든 행동이 같지는 않다. 인물별 말·행동·책임을 구분해서 읽는다.')]
y=668
for name,desc in rows:
    text(name,48,y,13,'Title',TEAL); y=para(desc,48,y-12,size=10.5,leading=17)-22
para('표기 안내: 이 자료는 강의 제목에 맞춰 “오뒷세이아”를 사용합니다. 다른 번역이나 영화에서는 “오디세이”, 영문 자료에서는 Odyssey로 표시될 수 있습니다. 영문 대조본의 Ulysses는 오뒷세우스입니다.',48,103,size=9,leading=14,color=MUTED)
finish()

for d in DATA:
    base(f"LECTURE {d['n']:02} / 18",d['focus'],f"{d['range']}   |   재생 시간 {d['time']}")
    label('읽기 전에: 장면의 위치',668)
    y=para(d['context'],48,648,size=11,leading=19)
    label('이번에 붙잡을 관점',y-31)
    y=para(d['lens'],48,y-48,size=11,leading=19)
    label('본문에 근거를 두고 답하기',y-32)
    y-=55
    for k,q in enumerate(d['questions'],1):
        y=para(f'{k}. {q}',48,y,size=11,leading=19)
        lines(y-20,2);y-=77
    label('강의를 들으며 남길 기록',y-2)
    y=para(d['track'],48,y-18,size=10.5,leading=17)
    para('권·행: __________________    영상 시각: __________________',48,y-17,size=9,color=MUTED)
    lines(y-56,3)
    assert y-102>61,(d['n'],y)
    finish()

base('FILM TO TEXT','영화와 원작을 비교하는 다섯 질문','영화의 특정 장면이나 각색을 미리 단정하지 않고, 실제 관람 뒤 기록합니다.')
y=665
for n,(t,b) in enumerate([
('출발점','영화는 누구의 시선, 어느 사건에서 시작하는가? 원작 1권의 시작과 비교한다.'),
('이야기의 순서','회상으로 전달되는 사건이 시간순으로 바뀌었는가? 정보를 아는 시점이 달라지면 긴장은 어떻게 변하는가?'),
('내면을 보여 주는 방식','원작의 말·침묵·비유를 영화는 표정, 소리, 편집, 공간으로 어떻게 표현하는가?'),
('곁에 있는 사람들','페넬로페, 텔레마코스, 집을 지키는 사람들이 말하고 판단하는 비중은 어떠한가?'),
('끝나는 지점','마지막 장면은 귀환의 어떤 문제를 해결하는가? 원작 23~24권을 기준으로 남는 질문을 적는다.')],1):
    label(f'{n:02}  {t}',y);y=para(b,48,y-18,size=10.5,leading=17)-44
label('짧은 비교문 쓰기',y)
para('“더 좋다”는 평가에 앞서 원작의 권·행, 영화의 장면, 달라진 표현 방식, 그 변화의 효과를 차례로 적습니다. 영화와 원작을 같은 사건 목록으로만 비교하지 않습니다.',48,y-19,size=11)
lines(140,3);finish()

base('SOURCES & NEXT STEP','출처와 자료 안내','본문의 근거와 강의의 설명, 나의 해석을 구분하며 읽기')
y=665
for title,body in [
('강의 목록과 재생 시간','판매자가 제공한 YouTube Studio 재생목록 화면(2026-09-10 확인)을 기준으로 18개 영상의 권·행 범위와 재생 시간을 옮겼습니다. 총 127,275초 = 35시간 21분 15초입니다.'),
('원작 대조','Homer, The Odyssey, Samuel Butler 영어 번역. Project Gutenberg #1727 및 MIT Internet Classics Archive의 24권 구성을 참조했습니다. 이 자료의 설명과 질문은 새로 작성했으며, 현대 한국어 번역문을 복제하지 않았습니다.'),
('번역 표기와 해석','Butler 번역의 Ulysses / Minerva / Jove는 각각 오뒷세우스 / 아테나 / 제우스에 대응합니다. 오래된 번역의 서문에 실린 저자·지리 관련 가설은 이 워크북의 확정 사실로 채택하지 않았습니다.'),
('활용 안내','이 워크북의 읽기 주제와 질문은 독립적으로 구성한 학습 활동입니다. 강의의 공식 소제목이나 강사의 발언을 의미하지 않습니다. 사용하는 번역본의 표기와 행 번호를 확인하고, 강의를 들으며 자신의 근거와 해석을 덧붙여 보세요.')]:
    label(title,y);y=para(body,48,y-18,size=10.5,leading=18)-28
label('온라인 대조본',y)
y-=23
for label_,url in [('Project Gutenberg - The Odyssey','https://www.gutenberg.org/ebooks/1727'),('MIT - The Odyssey, Books I-XXIV','https://classics.mit.edu/Homer/odyssey.html')]:
    text(label_,48,y,11,color=TEAL);C.linkURL(url,(48,y-3,547,y+15),relative=0)
    text(url,48,y-19,9,color=MUTED);y-=55
para('자료 구성: 이용 안내 1쪽, 강의 목차 2쪽, 서사 구조·인물 2쪽, 강의별 워크시트 18쪽, 영화 비교 1쪽, 대조 자료 1쪽과 표지. 이메일로 제공하는 원작 읽기 보조자료.',48,113,size=9,leading=15,color=MUTED)
finish()
C.save()
print(f'{OUT}\npages={page}')

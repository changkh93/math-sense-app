import json,ast,hashlib,re,pathlib,collections
raw=json.load(open('/tmp/metasense-python-course-sources.json'))
config=[('foundation','처음 파이썬',50),('games','게임 프로젝트',100),('advanced','파이썬 심화',50),('math','파이썬 수학',200)]
selected=[];excluded=[]
for region,(key,name,target) in zip(raw,config):
 pools=[];seen=set()
 for ch in region['chapters']:
  for unit in ch['units']:
   pool=[]
   for ex in unit['exercises']:
    code=ex.get('answerCode','').strip(); digest=hashlib.sha256(code.encode()).hexdigest()
    if not code or digest in seen: continue
    seen.add(digest)
    if len(code.splitlines())>90: excluded.append({'id':ex['id'],'reason':'long full-project code; use focused exercises'});continue
    try:compile(code,'example','exec');wrapper=''
    except SyntaxError as err:
     if 'outside' in str(err) and 'return' in str(err): wrapper='def context(self):\n'
     elif 'outside' in str(err) and 'break' in str(err):wrapper='while True:\n'
     else:excluded.append({'id':ex['id'],'reason':str(err)});continue
     try:compile(wrapper+'\n'.join('    '+s for s in code.splitlines()),'context','exec')
     except SyntaxError as err:excluded.append({'id':ex['id'],'reason':str(err)});continue
    title=re.sub(r'^(?:\d+단계:|세트 \d+:|\d+-\d+\s*)\s*','',ex['title']).replace('다시 작성','읽기').strip()
    pool.append({'course':key,'courseName':name,'chapter':ch['title'],'unit':unit['title'].strip(),'unitId':unit['id'],'exerciseId':ex['id'],'exerciseTitle':ex['title'],'focus':title,'code':code,'sha256':digest,'syntaxContext':wrapper,'pdf':unit.get('learningContents',{}).get('pdfUrl','')})
   if pool:pools.append(pool)
 # Round robin preserves every source unit before deeper exercises; no quantity created by renumbering.
 picks=[]
 while len(picks)<target:
  before=len(picks)
  for pool in pools:
   if pool and len(picks)<target:picks.append(pool.pop(0))
  if before==len(picks):raise Exception((key,len(picks),target))
 # source teaching order, then source exercise sequence
 order={u['id']:i for i,u in enumerate(u for c in region['chapters'] for u in c['units'])}
 picks.sort(key=lambda p:(order[p['unitId']],p['exerciseId']))
 for i,p in enumerate(picks,1):
  p['number']=i;p['slug']=f'code-{key}-{i:03d}';selected.append(p)
# Prefer concrete drawing/return-value activities over repeated Turtle() scaffolding.
replacements={7:4,10:5,16:5,23:4,31:3,32:4,33:4,41:4}
for item in selected:
 if item['course']=='foundation' and item['number'] in replacements:
  unit=next(u for c in raw[0]['chapters'] for u in c['units'] if u['id']==item['unitId'])
  ex=unit['exercises'][replacements[item['number']]-1];code=ex['answerCode'].strip()
  item.update(exerciseId=ex['id'],exerciseTitle=ex['title'],focus=ex['title'],code=code,sha256=hashlib.sha256(code.encode()).hexdigest())
path=pathlib.Path('content/python-guides/expansion');path.mkdir(exist_ok=True)
(path/'sources.json').write_text(json.dumps(selected,ensure_ascii=False,indent=2))
pathlib.Path('docs/marketing/python-expansion/SOURCE-EXCLUSIONS.json').write_text(json.dumps(excluded,ensure_ascii=False,indent=2))
print(collections.Counter(p['course'] for p in selected));print('excluded',len(excluded))

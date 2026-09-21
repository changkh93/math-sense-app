"""Offline validation. Never runs GUI, networking, file I/O, or arbitrary imports.
Syntax checks cover all sources. Runtime is a bounded smoke check, not a proof.
"""
import ast,json,pathlib,subprocess,tempfile,sys,collections,concurrent.futures
ROOT=pathlib.Path(__file__).resolve().parents[1]
source=json.loads((ROOT/'content/python-guides/expansion/sources.json').read_text())
ALLOWED={'math','fractions','itertools','random','numpy','pandas','statistics'}
BLOCKED={'open','exec','eval','compile','__import__','getattr','setattr','delattr','input','help','exit','quit','breakpoint'}
FILE_METHODS={'read_csv','read_excel','to_csv','to_excel','load','save','loadtxt','savetxt','read_pickle','to_pickle','plot'}
def check(item):
 code=item['code'];wrapped=item['syntaxContext']+'\n'.join('    '+s for s in code.splitlines()) if item['syntaxContext'] else code
 compile(wrapped,item['slug'],'exec');tree=ast.parse(code)
 result={'slug':item['slug'],'sourceSha256':item['sha256'],'syntax':'pass','context':item['syntaxContext'],'runtime':'not-run','reason':'','stdout':''}
 if item['syntaxContext']:result['reason']='프로젝트 반복문 또는 메서드 내부 코드';return result
 mods={a.name.split('.')[0] for n in ast.walk(tree) if isinstance(n,ast.Import) for a in n.names}|{n.module.split('.')[0] for n in ast.walk(tree) if isinstance(n,ast.ImportFrom) and n.module}
 if mods-ALLOWED:result['reason']='별도 환경 필요: '+', '.join(sorted(mods-ALLOWED));return result
 names={n.id for n in ast.walk(tree) if isinstance(n,ast.Name)}
 if names&BLOCKED:result['reason']='입력 또는 외부 작업 필요: '+', '.join(sorted(names&BLOCKED));return result
 attrs={n.attr for n in ast.walk(tree) if isinstance(n,ast.Attribute)}
 if attrs&FILE_METHODS:result['reason']='자료 파일 또는 별도 실행 환경 필요';return result
 if {'pygame','Turtle','Screen','tkinter','tk','self','canvas','window','screen','david','paul','kitty','king','rara','baby'}&names:result['reason']='그래픽 또는 앞 단계 객체 필요';return result
 # isolated cwd; static gate above is intentionally conservative. No credentials in child environment.
 prelude="import resource,random\nresource.setrlimit(resource.RLIMIT_CPU,(2,2))\nrandom.seed(7)\n"
 if 'numpy' in mods:prelude+='import numpy as np\nnp.random.seed(7)\n'
 try:
  with tempfile.TemporaryDirectory(prefix='ms-python-example-') as tmp:
   r=subprocess.run([sys.executable,'-c',prelude+code],cwd=tmp,capture_output=True,text=True,timeout=12,env={'PATH':'/usr/bin:/bin','PYTHONHASHSEED':'0','OPENBLAS_NUM_THREADS':'1'})
  if r.returncode==0:result.update(runtime='passed-smoke',stdout=r.stdout[:18000],reason='입력 없이 로컬 실행, 난수 seed 7 고정')
  else:result.update(runtime='needs-context-or-fix',reason=r.stderr.splitlines()[-1] if r.stderr else '시간/CPU 제한 종료')
 except subprocess.TimeoutExpired:result['reason']='실행 시간 제한; 종료 조건 검토 필요';result['runtime']='needs-context-or-fix'
 return result
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:results=list(pool.map(check,source))
out=ROOT/'content/python-guides/expansion/verification.json';out.write_text(json.dumps(results,ensure_ascii=False,indent=2))
print(json.dumps(collections.Counter(r['runtime'] for r in results),ensure_ascii=False));print('All',len(results),'syntax checks passed')

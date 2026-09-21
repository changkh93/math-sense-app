import ast,collections,contextlib,hashlib,io,json,pathlib,math
ROOT=pathlib.Path(__file__).resolve().parents[1];d=ROOT/'content/python-guides/expansion'
items=json.loads((d/'sources.json').read_text());checks=json.loads((d/'verification.json').read_text())
assert collections.Counter(a['course'] for a in items)=={'foundation':50,'games':100,'advanced':50,'math':200}
assert len({a['sha256'] for a in items})==400
assert len(checks)==400
semantic=[]
for item in items:
 assert hashlib.sha256(item['code'].encode()).hexdigest()==item['sha256']
 tree=ast.parse(item['code']);env={'math':math}
 funcs=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in {'is_prime','divisors','divisors1','gcd','gcd1','lcm','lcm_with_gcd','fibonacci_list','fibo_vars'}]
 # Pure selected definitions only; numpy-dependent versions excluded from this independent test.
 for f in funcs:
  if any(isinstance(n,ast.Name) and n.id=='np' for n in ast.walk(f)):continue
  exec(compile(ast.Module(body=[f],type_ignores=[]),item['slug'],'exec'),env)
  cases=[]
  if f.name=='is_prime':cases=[((n,),n>=2 and all(n%i for i in range(2,int(n**.5)+1))) for n in range(0,101)]
  elif f.name in ('divisors','divisors1'):cases=[((n,),[i for i in range(1,n+1) if n%i==0]) for n in range(1,51)]
  elif f.name in ('gcd','gcd1'):cases=[((a,b),math.gcd(a,b)) for a,b in [(24,10),(81,27),(7,13),(1,1),(9,0)]]
  elif f.name in ('lcm','lcm_with_gcd'):
   if f.name=='lcm_with_gcd' and 'gcd' not in env:continue
   cases=[((a,b),math.lcm(a,b)) for a,b in [(12,18),(20,75),(7,13),(1,1)]]
  elif f.name in ('fibonacci_list','fibo_vars'):cases=[((i+1,),v) for i,v in enumerate([1,1,2,3,5,8,13,21])]
  for args,expected in cases:
   with contextlib.redirect_stdout(io.StringIO()):got=env[f.name](*args)
   assert got==expected,(item['slug'],f.name,args,got,expected)
  semantic.append({'slug':item['slug'],'function':f.name,'cases':len(cases),'result':'pass','scope':'양의 정수 중심 명시적 표본; 모든 입력 보증 아님'})
(d/'semantic-checks.json').write_text(json.dumps(semantic,ensure_ascii=False,indent=2))
print('PASS: 400 distinct source hashes, exact 50/100/50/200 allocation;',sum(a['cases'] for a in semantic),'function cases across',len(semantic),'definitions')

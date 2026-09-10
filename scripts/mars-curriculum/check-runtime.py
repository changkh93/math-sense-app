import os
os.environ['SDL_VIDEODRIVER']='dummy'
os.environ['SDL_AUDIODRIVER']='dummy'
import pygame
import ast
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
os.chdir(ROOT/'public/mars-expedition')
results=[]
for f in sorted((ROOT/'content/mars-expedition/checkpoints').glob('*.py')):
    pygame.init()
    code=f.read_text()
    prefix=code[:code.index('running = True')]
    ns={'__name__':'__main__'}
    try:
        exec(compile(prefix,str(f),'exec'),ns)
        if 'mission' in ns and hasattr(ns['mission'],'state'):
            ns['mission'].state='playing'
        if f.stem >= '23-A' and f.stem != 'final-main':
            ns['robots'].add(ns['Robot'](ns['platforms'],ns['gates'],2,7))
        # Execute the actual loop body without wall-clock waits or input; verify draw as well as update.
        tree=ast.parse(code)
        loop=next(n for n in tree.body if isinstance(n,ast.While))
        body=loop.body[1:] # omit clock.tick assignment
        wrapper=ast.Module(body=[ast.For(target=ast.Name(id='_frame',ctx=ast.Store()),iter=ast.Call(func=ast.Name(id='range',ctx=ast.Load()),args=[ast.Constant(120)],keywords=[]),body=body,orelse=[])],type_ignores=[])
        ast.fix_missing_locations(wrapper)
        ns.update(running=True,seconds=1/60)
        exec(compile(wrapper,str(f),'exec'),ns)
        results.append({'id':f.stem,'ok':True})
    except Exception as e:
        results.append({'id':f.stem,'ok':False,'error':repr(e)})
    pygame.quit()
print(json.dumps(results,ensure_ascii=False,indent=2))
assert all(r['ok'] for r in results)

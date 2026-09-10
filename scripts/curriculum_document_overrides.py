"""Keep existing live editorial deletions when rebuilding student documents."""
import json
from pathlib import Path
RULES=json.loads(Path(__file__).with_suffix('.json').read_text())
def preserve_live_edits(course,number,document):
    for edit in RULES[course].get(f'{number:02}',[]):
        before,after=edit['before'],edit['after']
        if before not in document:
            # Source-level removal of the 01-A comparison link is also intentional.
            if '이 단계 누적 코드 01-A.py' in before:continue
            raise ValueError(f'Editorial override needs review: {course}/{number}: {before[:70]}')
        assert document.count(before)==1
        document=document.replace(before,after,1)
    return document

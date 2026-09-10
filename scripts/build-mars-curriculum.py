from pathlib import Path
import sys
folder = Path(__file__).parent / 'mars-curriculum'
sys.path.insert(0, str(folder))
from engine import emit
namespace = {}
for name in ['tutorial-stages.py', 'tutorial-later-stages.py', 'game-early-stages.py', 'game-later-stages.py', 'prose-review.py']:
    exec(compile((folder / name).read_text(), str(folder / name), 'exec'), namespace)
emit()

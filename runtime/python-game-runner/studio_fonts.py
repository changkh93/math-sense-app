"""Browser-safe pygame system-font aliases backed by the bundled Korean font."""
import base64
import os


# pygame's documented alias families plus common Korean desktop font names.
# Names are normalized the same way pygame.sysfont stores them.
FONT_NAMES = (
    'arial', 'helvetica', 'sans', 'sansserif', 'freesans', 'verdana', 'tahoma',
    'calibri', 'segoeui', 'trebuchetms', 'ubuntu', 'dejavusans', 'liberationsans',
    'times', 'timesnewroman', 'serif', 'freeserif', 'georgia', 'cambria',
    'constantia', 'dejavuserif', 'liberationserif',
    'courier', 'couriernew', 'monospace', 'consolas', 'dejavusansmono',
    'liberationmono', 'comicsansms', 'comicsans',
    'dohyeon', 'malgungothic', 'applegothic', 'applesdgothicneo',
    'nanumgothic', 'nanumsquare', 'gulim', 'dotum', 'batang', 'gungsuh',
    '맑은고딕', '애플고딕', '나눔고딕', '굴림', '돋움', '바탕', '궁서',
)


def _simple_name(name):
    return ''.join(character.lower() for character in name if character.isalnum())


def install(sysfont, fallback_font):
    """Register deterministic aliases without probing unavailable browser OS fonts."""
    if not fallback_font:
        return None
    path = '/tmp/metasense-system-font.ttf'
    if not os.path.exists(path):
        payload = fallback_font.split(',')[-1]
        with open(path, 'wb') as output:
            output.write(base64.b64decode(payload))

    # A regular face is intentional: pygame.SysFont applies synthetic bold and
    # italic when an exact styled face is unavailable.
    styles = {(False, False): path}
    for name in FONT_NAMES:
        sysfont.Sysfonts[_simple_name(name)] = styles
    sysfont.is_init = True
    return path

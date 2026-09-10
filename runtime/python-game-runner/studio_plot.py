"""Display genuine Matplotlib figures through Agg in the isolated browser runner."""
import base64
import struct
import zlib
import os


def install(bridge, root, fallback_font):
    import codecs
    # The compact WASM stdlib omits codec modules; use CPython's native codecs.
    def font_codec(name):
        if name == 'utf_16_be':
            return codecs.CodecInfo(name=name, encode=codecs.utf_16_be_encode, decode=codecs.utf_16_be_decode)
    try: codecs.lookup('utf-16-be')
    except LookupError: codecs.register(font_codec)
    import matplotlib
    matplotlib.use('Agg', force=True)
    from matplotlib import pyplot as plt, font_manager
    plt.close('all')
    matplotlib.rcdefaults()
    # Preserve a clean font registry across projects and remove uploaded font paths later.
    original_fonts = list(font_manager.fontManager.ttflist)
    original_show = plt.show
    if fallback_font:
        path = '/tmp/studio-DoHyeon.ttf'
        if not os.path.exists(path):
            with open(path, 'wb') as output: output.write(base64.b64decode(fallback_font.split(',')[-1]))
        font_manager.fontManager.addfont(path)
        matplotlib.rcParams['font.family'] = ['Do Hyeon', 'DejaVu Sans']
    for directory, _, files in os.walk(root):
        for filename in files:
            if filename.lower().endswith(('.ttf', '.otf')):
                font_manager.fontManager.addfont(os.path.join(directory, filename))
    matplotlib.rcParams['axes.unicode_minus'] = False
    shown = {}

    def show(*args, **kwargs):
        managers = list(plt._pylab_helpers.Gcf.get_all_fig_managers())
        if len(managers) > 20: raise ValueError('한 번에 그래프 20개까지 표시할 수 있습니다.')
        for manager in managers:
            figure = manager.canvas.figure
            if shown.get(figure) and not figure.stale: continue
            width, height = figure.get_size_inches() * figure.dpi
            if width * height > 8_000_000 or max(width, height) > 4096:
                raise ValueError('그래프 크기가 너무 큽니다. figsize 또는 dpi를 줄여 주세요.')
            # A missing Colab font should still produce readable Korean with the bundled font.
            from matplotlib.text import Text
            for text in figure.findobj(Text):
                families = text.get_fontfamily()
                if any('Nanum' in family for family in families):
                    available = {font.name for font in font_manager.fontManager.ttflist}
                    if not any(family in available for family in families): text.set_fontfamily(['Do Hyeon', 'DejaVu Sans'])
            figure.canvas.draw()
            width, height = figure.canvas.get_width_height()
            rgba = bytes(figure.canvas.buffer_rgba())
            def chunk(kind, data):
                return struct.pack('!I', len(data)) + kind + data + struct.pack('!I', zlib.crc32(kind + data))
            # The pinned Pillow WASM wheel has an ImagingCore ABI mismatch.
            # Encode Agg's genuine RGBA pixels as PNG using CPython stdlib.
            scanlines = b''.join(b'\x00' + rgba[y*width*4:(y+1)*width*4] for y in range(height))
            png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('!2I5B', width, height, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(scanlines)) + chunk(b'IEND', b'')
            shown.setdefault(figure, len(shown) + 1)
            bridge.studioPlotRender(shown[figure], base64.b64encode(png).decode('ascii'))
            figure.stale = False

    plt.show = show
    def cleanup():
        plt.close('all')
        plt.show = original_show
        matplotlib.rcdefaults()
        font_manager.fontManager.ttflist[:] = original_fonts
        font_manager.fontManager._findfont_cached.cache_clear()
        shown.clear()
    return show, cleanup

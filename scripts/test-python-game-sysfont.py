"""Unit checks for the browser pygame system-font compatibility layer."""
import base64
import importlib.util
from pathlib import Path
from types import SimpleNamespace
import tempfile
import unittest
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('studio_fonts', ROOT / 'runtime/python-game-runner/studio_fonts.py')
studio_fonts = importlib.util.module_from_spec(spec)
spec.loader.exec_module(studio_fonts)


class StudioSystemFonts(unittest.TestCase):
    def test_registers_latin_and_korean_aliases_without_system_probe(self):
        sysfont = SimpleNamespace(Sysfonts={}, Sysalias={}, is_init=False)
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'font.ttf'
            with patch.object(studio_fonts, 'os') as os_module:
                os_module.path.exists.return_value = False
                os_module.path.join = lambda *parts: str(path)
                with patch.object(studio_fonts, 'open', create=True) as open_file:
                    output = open_file.return_value.__enter__.return_value
                    installed = studio_fonts.install(sysfont, 'data:font/ttf;base64,' + base64.b64encode(b'font-data').decode())
                    output.write.assert_called_once_with(b'font-data')
            self.assertEqual(installed, '/tmp/metasense-system-font.ttf')
        for name in ('arial', 'timesnewroman', 'consolas', 'malgungothic', '맑은고딕'):
            self.assertEqual(sysfont.Sysfonts[name][False, False], '/tmp/metasense-system-font.ttf')
        self.assertTrue(sysfont.is_init)

    def test_empty_bundle_does_not_claim_font_support(self):
        sysfont = SimpleNamespace(Sysfonts={}, Sysalias={}, is_init=False)
        self.assertIsNone(studio_fonts.install(sysfont, ''))
        self.assertFalse(sysfont.is_init)


if __name__ == '__main__':
    unittest.main()

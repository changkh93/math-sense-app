"""Coordinator acceptance checks. Headless desktop Pygame, NOT browser proof.

Run from any directory: python3 <this file>. Optional argument: final-main.py path.
Loads reviewed setup/classes but omits the interactive module-level game loop.
"""
import ast
import os
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

os.environ['SDL_VIDEODRIVER'] = 'dummy'
os.environ['SDL_AUDIODRIVER'] = 'dummy'
os.environ['PYGAME_HIDE_SUPPORT_PROMPT'] = '1'
import pygame

TASK = Path(__file__).resolve().parent
ROOT = TASK.parents[3]
SOURCE = Path(sys.argv.pop(1)).resolve() if len(sys.argv) > 1 else TASK / 'draft/checkpoints/final-main.py'


class GameplayAcceptance(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        tree = ast.parse(SOURCE.read_text())
        prefix = []
        for node in tree.body:
            if isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id == 'running' for t in node.targets):
                break
            prefix.append(node)
        else:
            raise AssertionError('Expected module-level running assignment')
        cls.prefix = compile(ast.Module(body=prefix, type_ignores=[]), str(SOURCE), 'exec')
        os.chdir(ROOT / 'public/space-invaders')

    def setUp(self):
        self.ns = {'__name__': '__main__'}
        exec(self.prefix, self.ns)
        self.mission = self.ns['mission']
        self.scout = self.ns['scout']
        self.mission.state = 'playing'

    def tearDown(self):
        pygame.quit()

    def test_game_over_preserves_final_score_until_enter(self):
        self.mission.score = 700
        self.scout.lives = 0
        self.mission.check_game_status('피격', 'Enter')
        self.assertEqual(self.mission.state, 'game_over')
        self.assertIn('700', self.mission.pause_main_text)
        self.mission.draw()

    def test_movement_clamps_both_edges_after_step(self):
        for key, position in [(pygame.K_LEFT, 1), (pygame.K_RIGHT, 1135)]:
            with self.subTest(key=key):
                self.scout.rect.left = position
                keys = {pygame.K_LEFT: key == pygame.K_LEFT, pygame.K_RIGHT: key == pygame.K_RIGHT}
                with patch.object(pygame.key, 'get_pressed', return_value=keys):
                    self.scout.update()
                self.assertGreaterEqual(self.scout.rect.left, 0)
                self.assertLessEqual(self.scout.rect.right, 1200)

    def test_new_wave_clears_old_bullets_and_awards_current_round_bonus(self):
        self.mission.round_number = 2
        self.mission.score = 100
        self.ns['ScoutPulse'](200, 300, self.ns['scout_pulses'])
        self.ns['RaiderPulse'](200, 300, self.ns['raider_pulses'])
        self.ns['raiders'].empty()
        self.mission.check_round_completion()
        self.assertEqual(self.mission.score, 2100)
        self.assertEqual(self.mission.round_number, 3)
        self.assertEqual(len(self.ns['raiders']), 55)
        self.assertEqual(len(self.ns['scout_pulses']), 0)
        self.assertEqual(len(self.ns['raider_pulses']), 0)
        self.assertEqual(self.mission.state, 'paused')

    def test_update_stops_when_breach_pauses_game(self):
        def pause():
            self.mission.state = 'paused'
        with patch.object(self.mission, 'shift_raiders', side_effect=pause), patch.object(self.mission, 'check_collisions') as collisions, patch.object(self.mission, 'check_round_completion') as completion:
            self.mission.update()
            collisions.assert_not_called()
            completion.assert_not_called()

    def test_last_enemy_and_last_life_same_frame_keeps_game_over(self):
        self.scout.lives = 1
        self.ns['raiders'].empty()
        enemy = self.ns['Raider'](100, 100, 1, self.ns['raider_pulses'])
        self.ns['raiders'].add(enemy)
        shot = self.ns['ScoutPulse'](100, 100, self.ns['scout_pulses'])
        shot.rect.center = enemy.rect.center
        shot = self.ns['RaiderPulse'](100, 100, self.ns['raider_pulses'])
        shot.rect.center = self.scout.rect.center
        self.mission.update()
        self.assertEqual(self.mission.state, 'game_over')
        self.assertEqual(self.mission.round_number, 1)
        self.assertIn('100', self.mission.pause_main_text)

    def test_two_bullet_limit_and_offscreen_cleanup(self):
        for _ in range(3):
            self.scout.fire()
        self.assertEqual(len(self.ns['scout_pulses']), 2)
        for bullet in self.ns['scout_pulses']:
            bullet.rect.bottom = 0
        self.ns['scout_pulses'].update()
        self.assertEqual(len(self.ns['scout_pulses']), 0)
        self.scout.fire()
        self.assertEqual(len(self.ns['scout_pulses']), 1)

    def test_multiple_kills_score_each_enemy(self):
        self.ns['raiders'].empty()
        for _ in range(2):
            self.ns['raiders'].add(self.ns['Raider'](100, 100, 1, self.ns['raider_pulses']))
        shot = self.ns['ScoutPulse'](120, 120, self.ns['scout_pulses'])
        self.mission.check_collisions()
        self.assertEqual(self.mission.score, 200)
        self.assertEqual(len(self.ns['raiders']), 0)


if __name__ == '__main__':
    unittest.main(verbosity=2)

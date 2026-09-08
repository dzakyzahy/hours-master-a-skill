import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  ACHIEVEMENTS, 
  evaluateAchievements, 
  type AchievementEvaluationStats 
} from '../src/utils/achievements.ts';

describe('achievements system', () => {
  it('has valid defined achievements with required metadata', () => {
    assert.ok(ACHIEVEMENTS.length >= 6);
    for (const ach of ACHIEVEMENTS) {
      assert.ok(ach.id, 'Must have id');
      assert.ok(ach.title, 'Must have title');
      assert.ok(ach.desc, 'Must have desc');
      assert.ok(ach.tier, 'Must have tier');
      assert.ok(ach.criteriaText, 'Must have criteriaText');
    }
  });

  it('evaluates unlocked achievements correctly based on user stats', () => {
    const stats: AchievementEvaluationStats = {
      totalHours: 120,
      maxProjectHours: 120,
      dailyGoalMet: true,
      clashPinned: true,
      friendCount: 2,
      hasCustomBio: true
    };

    const newlyUnlocked = evaluateAchievements(stats, []);
    assert.ok(newlyUnlocked.includes('first_step'));
    assert.ok(newlyUnlocked.includes('century_club'));
    assert.ok(newlyUnlocked.includes('daily_grind'));
    assert.ok(newlyUnlocked.includes('arena_warrior'));
    assert.ok(newlyUnlocked.includes('networker'));
    assert.ok(newlyUnlocked.includes('identity_set'));
  });

  it('does not re-unlock already achieved IDs', () => {
    const stats: AchievementEvaluationStats = {
      totalHours: 120,
      maxProjectHours: 120,
      dailyGoalMet: true,
      clashPinned: true,
      friendCount: 2,
      hasCustomBio: true
    };

    // User already unlocked first_step and century_club
    const alreadyUnlocked = ['first_step', 'century_club'];
    const newlyUnlocked = evaluateAchievements(stats, alreadyUnlocked);

    assert.ok(!newlyUnlocked.includes('first_step'));
    assert.ok(!newlyUnlocked.includes('century_club'));
    assert.ok(newlyUnlocked.includes('daily_grind'));
  });

  it('keeps achievements locked if criteria are not met', () => {
    const beginnerStats: AchievementEvaluationStats = {
      totalHours: 0,
      maxProjectHours: 0,
      dailyGoalMet: false,
      clashPinned: false,
      friendCount: 0,
      hasCustomBio: false
    };

    const newlyUnlocked = evaluateAchievements(beginnerStats, []);
    assert.strictEqual(newlyUnlocked.length, 0);
  });

  it('contains valid tier distribution across bronze, silver, gold, diamond', () => {
    const validTiers = new Set(['bronze', 'silver', 'gold', 'diamond']);
    for (const ach of ACHIEVEMENTS) {
      assert.ok(validTiers.has(ach.tier), `Invalid tier ${ach.tier} for ${ach.id}`);
    }
  });

  it('supports unlock progression when user hours increase', () => {
    const step1 = evaluateAchievements({ totalHours: 1 }, []);
    assert.deepStrictEqual(step1, ['first_step']);

    const step2 = evaluateAchievements({ totalHours: 100 }, ['first_step']);
    assert.ok(step2.includes('century_club'));
    assert.ok(!step2.includes('first_step'));
  });
});

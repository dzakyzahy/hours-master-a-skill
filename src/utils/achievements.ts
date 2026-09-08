export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'diamond';

export interface Achievement {
  id: string;
  title: string;
  desc: string;
  tier: AchievementTier;
  criteriaText: string;
  icon: string; // Icon identifier
}

export interface AchievementEvaluationStats {
  totalHours: number;
  maxProjectHours?: number;
  dailyGoalMet?: boolean;
  clashPinned?: boolean;
  friendCount?: number;
  hasCustomBio?: boolean;
}

export const ACHIEVEMENTS: readonly Achievement[] = [
  {
    id: 'first_step',
    title: 'Langkah Pertama',
    desc: 'Menyelesaikan 1 jam fokus pertama di Skillo.',
    tier: 'bronze',
    criteriaText: 'Fokus minimal 1 jam',
    icon: 'Sparkles',
  },
  {
    id: 'deep_focus',
    title: 'Fokus Mendalam',
    desc: 'Mendedikasikan 10 jam fokus pada satu keterampilan atau proyek.',
    tier: 'bronze',
    criteriaText: 'Minimal 10 jam pada satu proyek',
    icon: 'Zap',
  },
  {
    id: 'daily_grind',
    title: 'Disiplin Harian',
    desc: 'Memenuhi target jam harian secara konsisten.',
    tier: 'silver',
    criteriaText: 'Mencapai target harian',
    icon: 'Flame',
  },
  {
    id: 'arena_warrior',
    title: 'Pejuang Arena',
    desc: 'Memasang papan peringkat Clash Arena di halaman depan Dashboard.',
    tier: 'silver',
    criteriaText: 'Pin leaderboard Clash Arena ke Dashboard',
    icon: 'Swords',
  },
  {
    id: 'networker',
    title: 'Rekan Kolaborasi',
    desc: 'Menghubungkan setidaknya 1 teman atau partner belajar.',
    tier: 'silver',
    criteriaText: 'Memiliki 1 teman atau partner',
    icon: 'Users',
  },
  {
    id: 'identity_set',
    title: 'Identitas Master',
    desc: 'Memasang bio atau gelar profesional pada profil personalmu.',
    tier: 'silver',
    criteriaText: 'Kustomisasi bio atau role title profil',
    icon: 'UserCheck',
  },
  {
    id: 'century_club',
    title: 'Klub 100 Jam',
    desc: 'Mencapai akumulasi 100 jam belajar dan pengasahan keterampilan.',
    tier: 'gold',
    criteriaText: 'Total fokus akumulatif 100 jam',
    icon: 'Trophy',
  },
  {
    id: 'halfway_there',
    title: 'Setengah Milenium',
    desc: 'Mencapai 500 jam perjalanan menuju penguasaan keterampilan.',
    tier: 'gold',
    criteriaText: 'Total fokus akumulatif 500 jam',
    icon: 'Award',
  },
  {
    id: 'master_zen',
    title: 'Grandmaster Skillo',
    desc: 'Mencapai 10.000 jam atau level tertinggi keahlian sejati.',
    tier: 'diamond',
    criteriaText: 'Total fokus akumulatif 1.000+ jam',
    icon: 'Crown',
  },
] as const;

/**
 * Evaluates user stats against achievement requirements.
 * Returns only newly unlocked achievement IDs that are not in alreadyUnlocked.
 */
export function evaluateAchievements(
  stats: AchievementEvaluationStats,
  alreadyUnlocked: readonly string[] = []
): string[] {
  const unlockedSet = new Set(alreadyUnlocked);
  const newlyUnlocked: string[] = [];

  const check = (id: string, condition: boolean) => {
    if (condition && !unlockedSet.has(id)) {
      newlyUnlocked.push(id);
    }
  };

  check('first_step', (stats.totalHours ?? 0) >= 1);
  check('deep_focus', (stats.maxProjectHours ?? 0) >= 10);
  check('century_club', (stats.totalHours ?? 0) >= 100);
  check('halfway_there', (stats.totalHours ?? 0) >= 500);
  check('master_zen', (stats.totalHours ?? 0) >= 1000);
  check('daily_grind', Boolean(stats.dailyGoalMet));
  check('arena_warrior', Boolean(stats.clashPinned));
  check('networker', (stats.friendCount ?? 0) >= 1);
  check('identity_set', Boolean(stats.hasCustomBio));

  return newlyUnlocked;
}

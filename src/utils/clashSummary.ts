export interface ClashParticipant {
  username: string;
  name?: string;
  totalHours: number;
  avatar?: string;
}

export interface ClashSummaryResult {
  myRank: number;
  totalParticipants: number;
  leader: ClashParticipant;
  isMeLeader: boolean;
  gapToLeader: number;
  topParticipants: ClashParticipant[];
}

export function getClashSummary(
  participants: ClashParticipant[],
  currentUsername: string
): ClashSummaryResult {
  const cleanMyName = (currentUsername || '').trim().toLowerCase().replace(/^@+/, '');
  const sorted = [...participants].sort((a, b) => (b.totalHours || 0) - (a.totalHours || 0));

  const totalParticipants = sorted.length;
  const defaultLeader: ClashParticipant = { username: cleanMyName || 'User', totalHours: 0 };
  const leader = sorted[0] || defaultLeader;

  const myIndex = sorted.findIndex(p => (p.username || '').toLowerCase().replace(/^@+/, '') === cleanMyName);
  const myRank = myIndex >= 0 ? myIndex + 1 : 1;
  const isMeLeader = myRank === 1;

  const myHours = myIndex >= 0 ? sorted[myIndex].totalHours : 0;
  const gapToLeader = isMeLeader ? 0 : Math.max(0, leader.totalHours - myHours);

  return {
    myRank,
    totalParticipants,
    leader,
    isMeLeader,
    gapToLeader,
    topParticipants: sorted.slice(0, 3)
  };
}

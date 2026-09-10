// Reading WebRTC quality. The pure parts are separated from getStats() so the
// thresholds can be tested without a browser.

export type CallQualityLevel = 'good' | 'fair' | 'poor';

export interface PeerStatsSample {
  packetsLost: number;
  packetsReceived: number;
  rttMs: number;
}

/**
 * Loss over the last interval, not since the call began — a call that dropped packets
 * once in minute one must not stay marked bad forever.
 */
export function deltaLossFraction(previous: PeerStatsSample | undefined, current: PeerStatsSample): number {
  const lost = current.packetsLost - (previous?.packetsLost ?? 0);
  const received = current.packetsReceived - (previous?.packetsReceived ?? 0);
  const total = lost + received;
  if (total <= 0) return 0;
  return Math.min(1, Math.max(0, lost / total));
}

/** Thresholds follow the usual VoIP rule of thumb: 2% loss or 200ms RTT is audible. */
export function classifyQuality(lossFraction: number, rttMs: number): CallQualityLevel {
  if (lossFraction >= 0.05 || rttMs >= 400) return 'poor';
  if (lossFraction >= 0.02 || rttMs >= 200) return 'fair';
  return 'good';
}

export async function readPeerStats(pc: RTCPeerConnection): Promise<PeerStatsSample> {
  const sample: PeerStatsSample = { packetsLost: 0, packetsReceived: 0, rttMs: 0 };

  const report = await pc.getStats();
  report.forEach((stat: any) => {
    if (stat.type === 'inbound-rtp' && !stat.isRemote) {
      sample.packetsLost += stat.packetsLost || 0;
      sample.packetsReceived += stat.packetsReceived || 0;
    } else if (stat.type === 'candidate-pair' && stat.state === 'succeeded' && stat.currentRoundTripTime) {
      sample.rttMs = Math.round(stat.currentRoundTripTime * 1000);
    }
  });

  return sample;
}

export function formatCallDuration(totalSeconds: number): string {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

export const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  sampleRate: 48000,
  channelCount: 1
};

export const VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 1280, max: 1920 },
  height: { ideal: 720, max: 1080 },
  frameRate: { ideal: 30, max: 30 },
  facingMode: 'user'
};

export function enhanceOpusSdp(sdp: string): string {
  if (!sdp || !sdp.includes('opus')) return sdp;

  // Find Opus payload type
  const opusMatch = sdp.match(/a=rtpmap:(\d+)\s+opus\/48000/i);
  if (!opusMatch) return sdp;

  const pt = opusMatch[1];
  const fmtpRegex = new RegExp(`a=fmtp:${pt}\\s+(.+?)(?:\\r?\\n)`, 'i');
  const fmtpMatch = sdp.match(fmtpRegex);

  const opusParams = 'useinbandfec=1;maxaveragebitrate=64000;stereo=0';

  if (fmtpMatch) {
    let currentParams = fmtpMatch[1];
    if (!currentParams.includes('useinbandfec')) {
      currentParams += ';useinbandfec=1';
    }
    if (!currentParams.includes('maxaveragebitrate')) {
      currentParams += ';maxaveragebitrate=64000';
    }
    return sdp.replace(fmtpMatch[0], `a=fmtp:${pt} ${currentParams}\r\n`);
  }

  // If no existing fmtp line, insert one right after rtpmap
  const rtpmapStr = opusMatch[0];
  return sdp.replace(rtpmapStr, `${rtpmapStr}\r\na=fmtp:${pt} ${opusParams}`);
}

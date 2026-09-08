import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatCallDuration,
  AUDIO_CONSTRAINTS,
  VIDEO_CONSTRAINTS,
  enhanceOpusSdp,
  enhanceVideoSdp
} from '../src/utils/callQuality.ts';

describe('callQuality & formatCallDuration', () => {
  it('formats call duration correctly for seconds and hours', () => {
    assert.strictEqual(formatCallDuration(0), '00:00');
    assert.strictEqual(formatCallDuration(5), '00:05');
    assert.strictEqual(formatCallDuration(65), '01:05');
    assert.strictEqual(formatCallDuration(599), '09:59');
    assert.strictEqual(formatCallDuration(3600), '01:00:00');
    assert.strictEqual(formatCallDuration(3665), '01:01:05');
  });

  it('has advanced audio constraints enabled', () => {
    assert.strictEqual(AUDIO_CONSTRAINTS.echoCancellation, true);
    assert.strictEqual(AUDIO_CONSTRAINTS.noiseSuppression, true);
    assert.strictEqual(AUDIO_CONSTRAINTS.autoGainControl, true);
    assert.strictEqual(AUDIO_CONSTRAINTS.sampleRate, 48000);
  });

  it('has HD video constraints configured', () => {
    assert.deepStrictEqual(VIDEO_CONSTRAINTS.width, { ideal: 1280, max: 1920 });
    assert.deepStrictEqual(VIDEO_CONSTRAINTS.height, { ideal: 720, max: 1080 });
  });

  it('enhances Opus SDP with forward error correction and optimal bitrate', () => {
    const rawSdp = `v=0
m=audio 9 UDP/TLS/RTP/SAVPF 111
a=rtpmap:111 opus/48000/2
a=fmtp:111 minptime=10
m=video 9 UDP/TLS/RTP/SAVPF 96`;

    const enhanced = enhanceOpusSdp(rawSdp);
    assert.ok(enhanced.includes('useinbandfec=1'));
    assert.ok(enhanced.includes('maxaveragebitrate=64000'));
  });

  it('enhances video SDP with target bitrate', () => {
    const rawSdp = `v=0
m=video 9 UDP/TLS/RTP/SAVPF 96
a=rtpmap:96 VP8/90000`;

    const enhanced = enhanceVideoSdp(rawSdp, 1500);
    assert.ok(enhanced.includes('b=AS:1500'));
  });
});

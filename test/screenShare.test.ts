import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { createScreenShareBundle } from '../src/utils/screenShare.ts';

type FakeTrack = {
  id: string;
  kind: 'audio' | 'video';
  enabled: boolean;
  muted: boolean;
  readyState: 'live' | 'ended';
  getSettings: () => MediaTrackSettings;
  stop: () => void;
};

class FakeMediaStream {
  private tracks: FakeTrack[];

  constructor(tracks: FakeTrack[] = []) {
    this.tracks = [...tracks];
  }

  addTrack(track: FakeTrack) { this.tracks.push(track); }
  getTracks() { return [...this.tracks]; }
  getAudioTracks() { return this.tracks.filter(track => track.kind === 'audio'); }
  getVideoTracks() { return this.tracks.filter(track => track.kind === 'video'); }
}

const track = (id: string, kind: FakeTrack['kind']): FakeTrack => ({
  id,
  kind,
  enabled: true,
  muted: false,
  readyState: 'live',
  getSettings: () => (kind === 'video' ? { displaySurface: 'browser' } : {}),
  stop() { this.readyState = 'ended'; },
});

const originalMediaStream = globalThis.MediaStream;
const originalAudioContext = globalThis.AudioContext;

afterEach(() => {
  globalThis.MediaStream = originalMediaStream;
  globalThis.AudioContext = originalAudioContext;
});

function installMediaFakes(resumeSucceeds: boolean) {
  const generated = track('mixed', 'audio');

  class FakeAudioContext {
    state: AudioContextState = 'suspended';
    createMediaStreamDestination() { return { stream: new FakeMediaStream([generated]) }; }
    createDynamicsCompressor() { return { connect() { return this; } }; }
    createGain() { return { gain: { value: 0 }, connect() { return this; } }; }
    createMediaStreamSource() { return { connect() { return this; } }; }
    async resume() { if (resumeSucceeds) this.state = 'running'; }
    async close() { this.state = 'closed'; }
  }

  globalThis.MediaStream = FakeMediaStream as unknown as typeof MediaStream;
  globalThis.AudioContext = FakeAudioContext as unknown as typeof AudioContext;
  return generated;
}

describe('screen share audio', () => {
  it('resumes Web Audio before sending the mixed microphone and display track', async () => {
    const generated = installMediaFakes(true);
    const microphone = new FakeMediaStream([track('mic', 'audio')]);
    const display = new FakeMediaStream([track('screen', 'video'), track('tab', 'audio')]);

    const bundle = await createScreenShareBundle(
      microphone as unknown as MediaStream,
      display as unknown as MediaStream,
    );

    assert.equal(bundle.audioMode, 'mixed');
    assert.equal(bundle.stream.getAudioTracks()[0], generated);
  });

  it('sends display audio directly when the browser keeps the mixer suspended', async () => {
    installMediaFakes(false);
    const displayAudio = track('tab', 'audio');
    const microphone = new FakeMediaStream([track('mic', 'audio')]);
    const display = new FakeMediaStream([track('screen', 'video'), displayAudio]);

    const bundle = await createScreenShareBundle(
      microphone as unknown as MediaStream,
      display as unknown as MediaStream,
    );

    assert.equal(bundle.audioMode, 'display-only');
    assert.equal(bundle.stream.getAudioTracks()[0], displayAudio);
  });
});

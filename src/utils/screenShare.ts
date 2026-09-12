export interface ScreenShareBundle {
  stream: MediaStream;
  hasDisplayAudio: boolean;
  audioMode: 'mixed' | 'display-only' | 'microphone-only' | 'none';
  cleanup: () => void;
}

export async function createScreenShareBundle(
  microphoneStream: MediaStream,
  displayStream: MediaStream
): Promise<ScreenShareBundle> {
  const output = new MediaStream();
  const displayVideo = displayStream.getVideoTracks()[0];
  const displayAudio = displayStream.getAudioTracks()[0];
  const microphoneAudio = microphoneStream.getAudioTracks()[0];
  let audioContext: AudioContext | null = null;
  let generatedAudioTrack: MediaStreamTrack | null = null;
  let audioMode: ScreenShareBundle['audioMode'] = 'none';

  if (displayVideo) output.addTrack(displayVideo);

  if (displayAudio && microphoneAudio) {
    audioContext = new AudioContext({ latencyHint: 'interactive' });
    const destination = audioContext.createMediaStreamDestination();
    const compressor = audioContext.createDynamicsCompressor();
    compressor.connect(destination);

    const displayGain = audioContext.createGain();
    displayGain.gain.value = 1;
    audioContext.createMediaStreamSource(new MediaStream([displayAudio])).connect(displayGain).connect(compressor);

    const microphoneGain = audioContext.createGain();
    microphoneGain.gain.value = 0.85;
    audioContext.createMediaStreamSource(new MediaStream([microphoneAudio])).connect(microphoneGain).connect(compressor);

    generatedAudioTrack = destination.stream.getAudioTracks()[0] || null;
    try {
      if (audioContext.state === 'suspended') await audioContext.resume();
    } catch (err) {
      console.warn('[screenShare] Audio mixer could not start:', err);
    }

    if (generatedAudioTrack && audioContext.state === 'running') {
      output.addTrack(generatedAudioTrack);
      audioMode = 'mixed';
    } else {
      // A suspended Web Audio context produces a valid-looking but silent track.
      // Keep the shared media audible even if the browser blocks the mixer.
      generatedAudioTrack?.stop();
      generatedAudioTrack = null;
      output.addTrack(displayAudio);
      audioMode = 'display-only';
      console.warn(`[screenShare] Mixer state is ${audioContext.state}; using display audio directly.`);
    }
  } else if (displayAudio) {
    output.addTrack(displayAudio);
    audioMode = 'display-only';
  } else if (microphoneAudio) {
    output.addTrack(microphoneAudio);
    audioMode = 'microphone-only';
  }

  console.info('[screenShare] Capture ready', {
    audioMode,
    displaySurface: displayVideo?.getSettings().displaySurface,
    displayAudio: displayAudio
      ? {
          enabled: displayAudio.enabled,
          muted: displayAudio.muted,
          readyState: displayAudio.readyState,
          settings: displayAudio.getSettings(),
        }
      : null,
    outputAudio: output.getAudioTracks().map(track => ({
      enabled: track.enabled,
      muted: track.muted,
      readyState: track.readyState,
      settings: track.getSettings(),
    })),
    mixerState: audioContext?.state ?? null,
  });

  return {
    stream: output,
    hasDisplayAudio: Boolean(displayAudio),
    audioMode,
    cleanup: () => {
      displayStream.getTracks().forEach(track => track.stop());
      generatedAudioTrack?.stop();
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().catch(() => {});
      }
    },
  };
}

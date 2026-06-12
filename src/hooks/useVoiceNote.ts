import { useCallback, useState } from "react";
import {
  type RecordingOptions,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";

/** Voice-note tuned recording: mono 64kbps AAC in an .m4a container —
 * small enough for slow connections, plenty for speech. */
const VOICE_OPTIONS: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  numberOfChannels: 1,
  bitRate: 64000,
};

interface UseVoiceNoteResult {
  recording: boolean;
  durationMs: number;
  /** Begin recording. Resolves false (without recording) if mic permission is denied. */
  start: () => Promise<boolean>;
  /** Stop and return the file uri, or null if nothing was captured. */
  stop: () => Promise<string | null>;
  /** Stop and throw the recording away. */
  cancel: () => Promise<void>;
}

export function useVoiceNote(): UseVoiceNoteResult {
  const recorder = useAudioRecorder(VOICE_OPTIONS);
  const state = useAudioRecorderState(recorder, 250);
  const [recording, setRecording] = useState(false);

  const start = useCallback(async (): Promise<boolean> => {
    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) return false;
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    setRecording(true);
    return true;
  }, [recorder]);

  const finish = useCallback(async (): Promise<string | null> => {
    setRecording(false);
    try {
      await recorder.stop();
    } finally {
      // Recording mode silences media volume on iOS; always restore it.
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    }
    return recorder.uri;
  }, [recorder]);

  const stop = finish;

  const cancel = useCallback(async (): Promise<void> => {
    await finish();
  }, [finish]);

  return {
    recording,
    durationMs: recording ? state.durationMillis : 0,
    start,
    stop,
    cancel,
  };
}

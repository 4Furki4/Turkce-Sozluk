import { act, renderHook } from "@testing-library/react";
import { useAudioRecorder } from "../use-audio-recorder";

let active: FakeRecorder;
class FakeRecorder {
  static isTypeSupported = (type: string) => type.startsWith("audio/webm");
  state = "inactive";
  mimeType = "audio/webm;codecs=opus";
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  constructor() { active = this; }
  start() { this.state = "recording"; }
  stop() { this.state = "inactive"; this.onstop?.(); }
}
const stop = jest.fn();
const media = { getTracks: () => [{ stop }] } as unknown as MediaStream;
const getUserMedia = jest.fn();
beforeEach(() => {
  stop.mockClear();
  getUserMedia.mockReset().mockResolvedValue(media);
  Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia }, configurable: true });
  Object.defineProperty(globalThis, "MediaRecorder", { value: FakeRecorder, configurable: true });
});
it("releases an active microphone and recorder when the task unmounts", async () => {
  const { result, unmount } = renderHook(() => useAudioRecorder());
  await act(() => result.current.startRecording());
  expect(result.current.isRecording).toBe(true);
  unmount();
  expect(stop).toHaveBeenCalled();
  expect(active.state).toBe("inactive");
});
it("releases permission results that arrive after the task was left", async () => {
  let grant!: (stream: MediaStream) => void;
  getUserMedia.mockReturnValue(new Promise<MediaStream>(resolve => { grant = resolve; }));
  const { result, unmount } = renderHook(() => useAudioRecorder());
  let recording!: Promise<void>;
  act(() => { recording = result.current.startRecording(); });
  unmount();
  await act(async () => { grant(media); await recording; });
  expect(stop).toHaveBeenCalledTimes(1);
});
it("retains the actual recording format and closes tracks when stopped", async () => {
  const { result } = renderHook(() => useAudioRecorder());
  await act(() => result.current.startRecording());
  act(() => {
    active.ondataavailable?.({ data: new Blob(["audio"], { type: active.mimeType }) });
    result.current.stopRecording();
  });
  expect(result.current.audioBlob?.type).toBe("audio/webm;codecs=opus");
  expect(result.current.isRecording).toBe(false);
  expect(stop).toHaveBeenCalled();
});
it("keeps microphone denial recoverable without a blocking dialog", async () => {
  getUserMedia.mockRejectedValue(new DOMException("Denied", "NotAllowedError"));
  const { result } = renderHook(() => useAudioRecorder());
  await act(() => result.current.startRecording());
  expect(result.current.recordingError).toBe(true);
  expect(result.current.isStarting).toBe(false);
  expect(result.current.isRecording).toBe(false);
});

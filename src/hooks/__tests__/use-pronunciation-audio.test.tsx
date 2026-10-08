import { act, fireEvent, render, screen } from "@testing-library/react";
import { usePronunciationAudio } from "../use-pronunciation-audio";

class TestAudio {
  paused = true;
  currentTime = 0;
  onplaying: (() => void) | null = null;
  onpause: (() => void) | null = null;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  play = jest.fn(async () => { this.paused = false; this.onplaying?.(); });
  pause = jest.fn(() => { this.paused = true; this.onpause?.(); });
  removeAttribute = jest.fn();
  load = jest.fn();
  constructor(public src: string) {}
}
let audio: TestAudio[];
function Control({ src = "/a.wav", word = "a" }: { src?: string; word?: string }) {
  const playback = usePronunciationAudio(src, word);
  return <button onClick={playback.toggle}>{word}:{playback.state}</button>;
}
beforeEach(() => {
  audio = [];
  window.Audio = jest.fn((src: string) => { const value = new TestAudio(src); audio.push(value); return value; }) as any;
});
test("audio is created only on click and stopped on navigation/unmount", async () => {
  const view = render(<Control />);
  expect(audio).toHaveLength(0);
  await act(async () => fireEvent.click(screen.getByRole("button")));
  expect(audio[0].play).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button")).toHaveTextContent("playing");
  view.rerender(<Control src="/b.wav" word="b" />);
  expect(audio[0].pause).toHaveBeenCalled();
  expect(screen.getByRole("button")).toHaveTextContent("b:idle");
  await act(async () => fireEvent.click(screen.getByRole("button")));
  view.unmount();
  expect(audio[1].pause).toHaveBeenCalled();
});
test("starting a second word stops the first, and playback failures can be retried", async () => {
  render(<><Control word="I" /><Control src="/i.wav" word="İ" /></>);
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "I:idle" })));
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "İ:idle" })));
  expect(audio[0].paused).toBe(true);
  act(() => audio[1].onerror?.());
  expect(screen.getByRole("button", { name: "İ:error" })).toBeInTheDocument();
  audio[1].paused = true;
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "İ:error" })));
  expect(screen.getByRole("button", { name: "İ:playing" })).toBeInTheDocument();
});

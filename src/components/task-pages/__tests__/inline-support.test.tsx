import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { InlineSupport } from "../inline-support";
it("handles supporting-input Enter without submitting the parent form", async () => {
  const submit = jest.fn(); const parent = jest.fn();
  render(<form onSubmit={parent}><InlineSupport open title="Add author" onSubmit={submit}><input aria-label="Author" /><textarea aria-label="Notes" /></InlineSupport></form>);
  fireEvent.keyDown(screen.getByLabelText("Author"), { key: "Enter" });
  await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
  expect(parent).not.toHaveBeenCalled();
  fireEvent.keyDown(screen.getByLabelText("Notes"), { key: "Enter" });
  expect(submit).toHaveBeenCalledTimes(1);
});

it("blocks repeated Enter during an in-flight supporting submission", async () => {
  let finish!: () => void;
  const submit = jest.fn(() => new Promise<void>(resolve => { finish = resolve; }));
  render(<InlineSupport open title="Add author" onSubmit={submit}><input aria-label="Author" /></InlineSupport>);
  fireEvent.keyDown(screen.getByLabelText("Author"), { key: "Enter" });
  fireEvent.keyDown(screen.getByLabelText("Author"), { key: "Enter" });
  await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
  finish();
});

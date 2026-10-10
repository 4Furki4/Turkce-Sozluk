import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DailyWordsManagement from "../daily-words-management";

const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockToastError = jest.fn();
jest.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: (...args: unknown[]) => mockToastError(...args) } }));
jest.mock("@/src/trpc/react", () => ({ api: {
  word: {
    searchWordsSimple: { useQuery: () => ({ data: { words: [{ id: 99, word: "yeni" }] }, isFetching: false }) },
    getWordById: { useQuery: () => ({ data: undefined, isLoading: false }) },
  },
  admin: { dailyWords: {
    addDailyWord: { useMutation: () => ({ mutate: mockCreate, isPending: false }) },
    updateDailyWord: { useMutation: () => ({ mutate: mockUpdate, isPending: false }) },
  } },
} }));
jest.mock("@/src/components/customs/heroui/custom-input", () => ({
  CustomInput: ({ label, onValueChange, isRequired, ...props }: any) => <label>{label}<input {...props} onChange={event => onValueChange(event.target.value)} /></label>,
}));
jest.mock("@heroui/react", () => {
  const { Item } = jest.requireActual("@react-stately/collections");
  return {
    AutocompleteItem: Item,
    ModalHeader: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
    ModalBody: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
    ModalFooter: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
    Button: ({ children, onPress, isLoading, color, variant, ...props }: any) => <button {...props} onClick={onPress}>{children}</button>,
  };
});
jest.mock("@/src/components/customs/heroui/custom-autocomplete", () => {
  const { useComboBoxState } = jest.requireActual("@react-stately/combobox");
  return {
    // Keep HeroUI's actual selection/blur state machine; only replace its visual shell.
    CustomAutocomplete: function ComboBox(props: any) {
      const state = useComboBoxState(props);
      return <div>
        <label>{props.label}<input role="combobox" value={state.inputValue}
          onChange={event => state.setInputValue(event.target.value)}
          onFocus={() => state.setFocused(true)} onBlur={() => state.setFocused(false)} /></label>
        {[...state.collection].map((item: any) => <button type="button" key={item.key}
          onClick={() => state.setSelectedKey(item.key)}>Select {item.textValue}</button>)}
      </div>;
    },
  };
});

const initialData = { id: 7, wordId: 42, wordName: "kelime", date: "2026-10-10" };

beforeEach(() => jest.clearAllMocks());

it("retains the selected initial word when saving without edits", async () => {
  const user = userEvent.setup();
  render(<DailyWordsManagement onClose={jest.fn()} initialData={initialData} />);
  expect(screen.getByRole("combobox")).toHaveValue("kelime");
  await user.click(screen.getByRole("button", { name: "save" }));
  expect(mockUpdate).toHaveBeenCalledWith({ id: 7, wordId: 42, date: "2026-10-10" });
});

it("requires a new word after keyboard clearing and blur", async () => {
  const user = userEvent.setup();
  render(<DailyWordsManagement onClose={jest.fn()} initialData={initialData} />);
  const input = screen.getByRole("combobox");
  await user.click(input);
  await user.keyboard("{Control>}a{/Control}{Backspace}");
  await user.tab();
  expect(input).toHaveValue("");
  await user.click(screen.getByRole("button", { name: "save" }));
  expect(mockUpdate).not.toHaveBeenCalled();
  expect(mockToastError).toHaveBeenCalledWith("required");

  await user.click(screen.getByRole("button", { name: "Select yeni" }));
  expect(input).toHaveValue("yeni");
  await user.click(screen.getByRole("button", { name: "save" }));
  expect(mockUpdate).toHaveBeenCalledWith({ id: 7, wordId: 99, date: "2026-10-10" });
});

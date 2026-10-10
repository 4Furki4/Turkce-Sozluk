import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { CalendarDate } from "@internationalized/date";
import en from "@/messages/en.json";
import tr from "@/messages/tr.json";

let mockMessages: typeof en | typeof tr = en;
jest.mock("next-intl", () => ({
    useTranslations: (namespace: "SharedUI" | "Errors") => (key: string, values?: Record<string, string>) => {
        let value = (mockMessages[namespace] as Record<string, string>)[key];
        for (const [name, replacement] of Object.entries(values ?? {})) value = value.replace(`{${name}}`, replacement);
        return value;
    },
}));
import { CustomInput } from "../custom-input";
import { CustomAutocomplete } from "../custom-autocomplete";
import { CustomMultiSelect } from "../custom-multi-select";
import { CustomDateRangePicker } from "../custom-date-range-picker";

const mockInput = jest.fn();
const mockAutocomplete = jest.fn();
const mockSelect = jest.fn();
const mockDateRangePicker = jest.fn();

jest.mock("valtio", () => ({ useSnapshot: () => ({ isBlurEnabled: false }) }));
jest.mock("@/src/store/preferences", () => ({ preferencesState: {} }));
jest.mock("@internationalized/date", () => ({
    ...jest.requireActual("@internationalized/date"),
    getLocalTimeZone: () => "Europe/Istanbul",
}));
jest.mock("@heroui/react", () => ({
    Input: React.forwardRef(function MockInput(props: object, ref) { mockInput(props); return <input ref={ref as React.Ref<HTMLInputElement>} aria-label="Name" />; }),
    Autocomplete: (props: object) => { mockAutocomplete(props); return null; },
    DateRangePicker: (props: object) => { mockDateRangePicker(props); return null; },
    Select: (props: { label: string; selectedKeys: Set<string>; onSelectionChange: (keys: string) => void; isDisabled?: boolean }) => {
        mockSelect(props);
        return <button data-slot="trigger" disabled={props.isDisabled} onClick={() => props.onSelectionChange("all")}>{props.label}</button>;
    },
    SelectItem: () => null,
}));

function localized(ui: React.ReactNode, locale: "en" | "tr" = "en") {
    mockMessages = locale === "tr" ? tr : en;
    return render(<>{ui}</>);
}

beforeEach(() => jest.clearAllMocks());

test("input forwards layout classes and combines slot defaults with caller overrides", () => {
    localized(<CustomInput className="max-w-sm" classNames={{ inputWrapper: "h-10", input: "text-lg", description: "custom-description" }} />);
    const props = mockInput.mock.calls.at(-1)![0];
    expect(props.className).toBe("max-w-sm");
    expect(props.classNames.inputWrapper).toContain("border-primary/40");
    expect(props.classNames.inputWrapper).toContain("h-10");
    expect(props.classNames.input).toContain("text-lg");
    expect(props.classNames.input).not.toContain("text-base");
    expect(props.classNames.description).toBe("custom-description");
});

test("autocomplete keeps input events and accessibility props without dropping its typography", () => {
    const onBlur = jest.fn();
    localized(<CustomAutocomplete inputProps={{ onBlur, "aria-describedby": "hint", classNames: { inputWrapper: "h-12" } }} classNames={{ popoverContent: "max-w-sm" }}>{[]}</CustomAutocomplete>);
    const props = mockAutocomplete.mock.calls.at(-1)![0];
    expect(props.inputProps.onBlur).toBe(onBlur);
    expect(props.inputProps["aria-describedby"]).toBe("hint");
    expect(props.inputProps.classNames.input).toContain("text-base");
    expect(props.inputProps.classNames.inputWrapper).toContain("h-12");
    expect(props.inputProps.classNames.inputWrapper).toContain("border-primary/40");
    expect(props.classNames.popoverContent).toContain("bg-background");
    expect(props.classNames.popoverContent).toContain("max-w-sm");
});

test.each([
    [{ key: "noun", label: "Noun" }, { key: "verb", label: "Verb" }],
    { noun: "Noun", verb: "Verb" },
])("select all returns the domain keys for either option representation", options => {
    const onSelectionChange = jest.fn();
    localized(<CustomMultiSelect label="Parts of speech" size="md" options={options} selectedKeys={[]} onSelectionChange={onSelectionChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Parts of speech" }));
    expect(onSelectionChange).toHaveBeenCalledWith(["noun", "verb"]);
    expect(mockSelect.mock.calls.at(-1)![0].size).toBe("md");
});

test("clearing is a separate localized button and returns focus to the select", () => {
    function Filter() {
        const [keys, setKeys] = React.useState(["noun"]);
        return <CustomMultiSelect label="Sözcük türü" options={{ noun: "İsim" }} selectedKeys={keys} onSelectionChange={setKeys} onClear={() => setKeys([])} />;
    }
    localized(<Filter />, "tr");
    const clear = screen.getByRole("button", { name: "Sözcük türü seçimini temizle" });
    // The regression was an invalid button nested inside the select trigger.
    // eslint-disable-next-line testing-library/no-node-access
    expect(clear.closest("button")?.parentElement?.closest("button")).toBeNull();
    fireEvent.click(clear);
    expect(screen.queryByRole("button", { name: "Sözcük türü seçimini temizle" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sözcük türü" })).toHaveFocus();
});

test.each(["isDisabled", "isLoading", "disallowEmptySelection"])("%s prevents clearing", flag => {
    const onClear = jest.fn();
    localized(<CustomMultiSelect label="Language" options={{ tr: "Turkish" }} selectedKeys={["tr"]} onSelectionChange={jest.fn()} onClear={onClear} {...{ [flag]: true }} />);
    const clear = screen.getByRole("button", { name: "Clear Language selection" });
    expect(clear).toBeDisabled();
    fireEvent.click(clear);
    expect(onClear).not.toHaveBeenCalled();
});

test("a date range round-trips local midnight without shifting to the previous UTC date", () => {
    const onDateRangeChange = jest.fn();
    localized(<CustomDateRangePicker value={{ start: new Date("2026-10-09T00:00:00+03:00"), end: new Date("2026-10-10T00:00:00+03:00") }} onDateRangeChange={onDateRangeChange} />);
    const props = mockDateRangePicker.mock.calls.at(-1)![0];
    expect(props.value.start.toString()).toBe("2026-10-09");
    expect(props.value.end.toString()).toBe("2026-10-10");
    props.onChange({ start: new CalendarDate(2026, 10, 9), end: new CalendarDate(2026, 10, 10) });
    expect(onDateRangeChange).toHaveBeenCalledWith(new Date("2026-10-09T00:00:00+03:00"), new Date("2026-10-10T00:00:00+03:00"));
    props.onChange(null);
    expect(onDateRangeChange).toHaveBeenLastCalledWith(null, null);
});

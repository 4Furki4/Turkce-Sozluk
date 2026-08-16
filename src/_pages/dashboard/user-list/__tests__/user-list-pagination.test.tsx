import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import UserList from "../user-list";

const mockGetUsersUseQuery = jest.fn();
const mockGetUserCountUseQuery = jest.fn();

jest.mock("@/src/trpc/react", () => ({
    api: {
        user: {
            getUsers: {
                useQuery: (...args: unknown[]) => mockGetUsersUseQuery(...args),
            },
            getUserCount: {
                useQuery: (...args: unknown[]) => mockGetUserCountUseQuery(...args),
            },
        },
    },
}));

jest.mock("@heroui/react", () => {
    const React = require("react");

    return {
        Table: ({ topContent, bottomContent, children }: any) => (
            <div>
                {topContent}
                {children}
                {bottomContent}
            </div>
        ),
        TableHeader: () => null,
        TableColumn: ({ children }: any) => <span>{children}</span>,
        TableBody: ({ items, children, loadingContent, loadingState }: any) => {
            if (loadingState === "loading") {
                return <div data-testid="table-body">{loadingContent}</div>;
            }

            return (
                <div data-testid="table-body">
                    {items.map((item: any) => children(item))}
                </div>
            );
        },
        TableRow: ({ children }: any) => (
            <div data-testid="user-row">
                {["name", "role", "actions"].map((columnKey) => (
                    <React.Fragment key={columnKey}>{children(columnKey)}</React.Fragment>
                ))}
            </div>
        ),
        TableCell: ({ children }: any) => <span>{children}</span>,
        User: ({ name, description }: any) => (
            <span>
                {name}
                {description}
            </span>
        ),
        Spinner: () => <span>Loading</span>,
        Dropdown: () => null,
        DropdownTrigger: ({ children }: any) => <>{children}</>,
        DropdownMenu: ({ children }: any) => <>{children}</>,
        DropdownSection: ({ children }: any) => <>{children}</>,
        DropdownItem: ({ children }: any) => <>{children}</>,
        Link: ({ children, href }: any) => <a href={href}>{children}</a>,
        useDisclosure: () => ({
            isOpen: false,
            onOpen: jest.fn(),
            onOpenChange: jest.fn(),
        }),
    };
});

jest.mock("@heroui/pagination", () => ({
    Pagination: ({
        isDisabled,
        onChange,
        page,
        total,
    }: {
        isDisabled?: boolean;
        onChange: (page: number) => void;
        page: number;
        total: number;
    }) => (
        <div data-page={page} data-testid="pagination" data-total={total}>
            <button disabled={isDisabled || total < 2} type="button" onClick={() => onChange(2)}>
                Go to page 2
            </button>
        </div>
    ),
}));

jest.mock("@heroui/select", () => ({
    Select: ({ children, label, onChange, selectedKeys }: any) => {
        const selectedKey = Array.from(selectedKeys)[0];

        return (
            <label>
                {label}
                <select aria-label={label} value={String(selectedKey)} onChange={onChange}>
                    {children}
                </select>
            </label>
        );
    },
    SelectItem: ({ children }: any) => <option value={children}>{children}</option>,
}));

jest.mock("@/src/i18n/routing", () => ({
    Link: ({ children, href, ...props }: any) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
}));

jest.mock("../role-edit-modal", () => () => null);
jest.mock("../user-delete-modal", () => () => null);
jest.mock("../badge-assignment-modal", () => () => null);

const allUsers = Array.from({ length: 12 }, (_, index) => ({
    id: `user-${index + 1}`,
    name: `User ${index + 1}`,
    username: `user${index + 1}`,
    email: `user${index + 1}@example.com`,
    image: null,
    role: "user",
}));

function expectLastUserQuery(input: { take: number; skip: number }) {
    const lastCall = mockGetUsersUseQuery.mock.calls.at(-1);

    expect(lastCall?.[0]).toEqual(input);
}

describe("UserList pagination", () => {
    beforeEach(() => {
        mockGetUserCountUseQuery.mockReturnValue({ data: allUsers.length });
        mockGetUsersUseQuery.mockImplementation((input, options) => ({
            data: options.initialData ?? allUsers.slice(input.skip, input.skip + input.take),
            isFetching: false,
        }));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("loads the selected number of users instead of reusing the first page", async () => {
        render(<UserList users={allUsers.slice(0, 10) as any} userCount={allUsers.length} />);

        expect(screen.getAllByTestId("user-row")).toHaveLength(10);

        fireEvent.change(screen.getByLabelText("Words per page"), {
            target: { value: "5" },
        });

        await waitFor(() => {
            expectLastUserQuery({ take: 5, skip: 0 });
            expect(screen.getAllByTestId("user-row")).toHaveLength(5);
        });
        expect(screen.getByTestId("pagination")).toHaveAttribute("data-page", "1");
    });

    it("loads the second page with the selected page size", async () => {
        render(<UserList users={allUsers.slice(0, 10) as any} userCount={allUsers.length} />);

        fireEvent.change(screen.getByLabelText("Words per page"), {
            target: { value: "5" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Go to page 2" }));

        await waitFor(() => {
            expectLastUserQuery({ take: 5, skip: 5 });
            expect(screen.getAllByTestId("user-row")).toHaveLength(5);
        });
        expect(screen.getByText("User 6")).toBeInTheDocument();
        expect(screen.queryByText("User 1")).not.toBeInTheDocument();
        expect(screen.getByTestId("pagination")).toHaveAttribute("data-page", "2");
    });

    it("returns to the first page when the page size changes", async () => {
        render(<UserList users={allUsers.slice(0, 10) as any} userCount={allUsers.length} />);

        fireEvent.change(screen.getByLabelText("Words per page"), {
            target: { value: "5" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Go to page 2" }));
        fireEvent.change(screen.getByLabelText("Words per page"), {
            target: { value: "20" },
        });

        await waitFor(() => {
            expectLastUserQuery({ take: 20, skip: 0 });
            expect(screen.getAllByTestId("user-row")).toHaveLength(12);
        });
        expect(screen.getByTestId("pagination")).toHaveAttribute("data-page", "1");
    });

    it("returns to the last available page when the user count shrinks", async () => {
        const { rerender } = render(
            <UserList users={allUsers.slice(0, 10) as any} userCount={allUsers.length} />
        );

        fireEvent.change(screen.getByLabelText("Words per page"), {
            target: { value: "5" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Go to page 2" }));
        mockGetUserCountUseQuery.mockReturnValue({ data: 4 });
        rerender(<UserList users={allUsers.slice(0, 10) as any} userCount={allUsers.length} />);

        await waitFor(() => {
            expectLastUserQuery({ take: 5, skip: 0 });
            expect(screen.getByTestId("pagination")).toHaveAttribute("data-page", "1");
            expect(screen.getByTestId("pagination")).toHaveAttribute("data-total", "1");
        });
    });

    it("shows the loading state while a changed page-size query is pending", () => {
        mockGetUsersUseQuery.mockImplementation((input, options) => ({
            data: input.take === 10 ? options.initialData : undefined,
            isFetching: input.take !== 10,
        }));
        render(<UserList users={allUsers.slice(0, 10) as any} userCount={allUsers.length} />);

        fireEvent.change(screen.getByLabelText("Words per page"), {
            target: { value: "5" },
        });

        expect(screen.getByText("Loading")).toBeInTheDocument();
    });

    it("ignores an empty page-size selection", () => {
        render(<UserList users={allUsers.slice(0, 10) as any} userCount={allUsers.length} />);

        fireEvent.change(screen.getByLabelText("Words per page"), {
            target: { value: "" },
        });

        expectLastUserQuery({ take: 10, skip: 0 });
        expect(mockGetUsersUseQuery).toHaveBeenCalledTimes(1);
    });
});

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import type { SelectUser } from '@/db/schema/users';
import UserList from '../user-list';

const mockUsers = Array.from({ length: 23 }, (_, index) => ({
    id: String(index + 1), name: `User ${index + 1}`, username: null,
    email: `user${index + 1}@example.test`, image: null, role: 'user',
})) as SelectUser[];
const mockFetchUsers = jest.fn(async ({ take, skip }) => mockUsers.slice(skip, skip + take));

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key === 'usersPerPage' ? 'Users per page' : 'Users' }));
jest.mock('@/src/trpc/react', () => ({ api: { user: {
    getUserCount: { useQuery: (_: unknown, options: object) => useQuery({
        queryKey: ['userCount'], queryFn: async () => mockUsers.length, ...options,
    }) },
    getUsers: { useQuery: (input: { take: number; skip: number }, options: object) => useQuery({
        queryKey: ['users', input], queryFn: () => mockFetchUsers(input), ...options,
    }) },
} } }));
jest.mock('@/src/i18n/routing', () => ({ Link: ({ children }: any) => <>{children}</> }));
jest.mock('../role-edit-modal', () => () => null);
jest.mock('../user-delete-modal', () => () => null);
jest.mock('../badge-assignment-modal', () => () => null);
jest.mock('@heroui/react', () => ({
    useDisclosure: () => ({ isOpen: false, onOpen: jest.fn(), onOpenChange: jest.fn() }),
    Table: ({ topContent, bottomContent, children }: any) => <>{topContent}<table>{children}</table>{bottomContent}</>,
    TableHeader: ({ columns, children }: any) => <thead><tr>{columns.map(children)}</tr></thead>,
    TableColumn: ({ children }: any) => <th>{children}</th>,
    TableBody: ({ items, children }: any) => <tbody>{items.map(children)}</tbody>,
    TableRow: ({ children }: any) => <tr>{['name', 'role', 'actions'].map(key => <React.Fragment key={key}>{children(key)}</React.Fragment>)}</tr>,
    TableCell: ({ children }: any) => <td>{children}</td>,
    User: ({ name }: any) => <span>{name}</span>,
    Link: ({ children }: any) => <span>{children}</span>,
    Spinner: () => null,
    Dropdown: () => null,
}));
jest.mock('@heroui/select', () => ({
    Select: ({ label, selectedKeys, onChange, children }: any) => <label>{label}<select value={Array.from(selectedKeys)[0] as string} onChange={onChange}>{children}</select></label>,
    SelectItem: ({ children }: any) => <option value={children}>{children}</option>,
}));
jest.mock('@heroui/pagination', () => ({
    Pagination: ({ total, page, onChange }: any) => <nav aria-label="Pagination">{Array.from({ length: total }, (_, i) => <button key={i} aria-current={page === i + 1 ? 'page' : undefined} onClick={() => onChange(i + 1)}>{i + 1}</button>)}</nav>,
}));

function setup() {
    const client = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: false, gcTime: 0 } } });
    render(<QueryClientProvider client={client}>
        <UserList users={mockUsers.slice(0, 10)} userCount={23} />
    </QueryClientProvider>);
    return client;
}

beforeEach(() => mockFetchUsers.mockClear());

test('fetches the requested page instead of caching the server first page under every key', async () => {
    setup();
    expect(screen.getByText('User 1')).toBeInTheDocument();
    expect(mockFetchUsers).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '2', exact: true }));
    expect(await screen.findByText('User 11')).toBeInTheDocument();
    expect(screen.queryByText('User 1')).not.toBeInTheDocument();
    expect(mockFetchUsers).toHaveBeenCalledWith({ take: 10, skip: 10 });
    fireEvent.click(screen.getByRole('button', { name: '3', exact: true }));
    expect(await screen.findByText('User 23')).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(4);
});

test('changing page size resets both the selected page and query offset', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: '3', exact: true }));
    await screen.findByText('User 23');
    fireEvent.change(screen.getByLabelText('Users per page'), { target: { value: '20' } });
    await screen.findByText('User 1');
    expect(screen.getByRole('button', { name: '1', exact: true })).toHaveAttribute('aria-current', 'page');
    expect(screen.getAllByRole('row')).toHaveLength(21);
    expect(mockFetchUsers).toHaveBeenCalledWith({ take: 20, skip: 0 });
    fireEvent.change(screen.getByLabelText('Users per page'), { target: { value: '5' } });
    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(6));
    expect(mockFetchUsers).toHaveBeenCalledWith({ take: 5, skip: 0 });
});

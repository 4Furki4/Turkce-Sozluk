import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import WordList from '../word-list';
import tr from '@/messages/tr.json';
import en from '@/messages/en.json';

let mockLocale = 'tr';
let mockSearchParams = new URLSearchParams();
const mockRetryWords = jest.fn();
const mockRetryCount = jest.fn();
let mockWordState: Record<string, unknown>;
let mockCountState: Record<string, unknown>;
const mockWordsQuery = jest.fn(() => mockWordState);
const mockCountQuery = jest.fn(() => mockCountState);
const mockOptions = {
    partOfSpeechs: [{ id: 1, partOfSpeech: 'isim' }],
    languages: [{ id: 2, language_tr: 'Türkçe', language_en: 'Turkish' }],
    attributes: [{ id: 3, attribute: 'mecaz' }],
};

jest.mock('@/src/trpc/react', () => ({ api: { word: {
    getWords: { useQuery: (...args: unknown[]) => mockWordsQuery(...args as []) },
    getWordCount: { useQuery: (...args: unknown[]) => mockCountQuery(...args as []) },
    getFilterOptions: { useQuery: () => ({ data: mockOptions }) },
} } }));
jest.mock('next/navigation', () => ({
    usePathname: () => '/tr/kelime-listesi',
    useSearchParams: () => mockSearchParams,
}));
jest.mock('next-intl', () => ({
    useLocale: () => mockLocale,
    useTranslations: (namespace: string) => (key: string, values: Record<string, unknown> = {}) => {
        let message: unknown = mockLocale === 'tr' ? tr : en;
        for (const part of `${namespace}.${key}`.split('.')) message = (message as Record<string, unknown>)[part];
        return String(message).replace(/\{(\w+)\}/g, (_, name) => String(values[name]));
    },
}));
jest.mock('@uidotdev/usehooks', () => ({ useDebounce: (value: unknown) => value }));
jest.mock('@/src/i18n/routing', () => ({ Link: ({ children, href, prefetch, ...props }: any) => <a {...props} href={typeof href === 'string' ? href : `/word/${href.params.word}`}>{children}</a> }));
jest.mock('@heroui/react', () => ({
    Button: ({ children, onPress, isDisabled, isLoading, isIconOnly, startContent, endContent, variant, color, radius, fullWidth, ...props }: any) => <button {...props} disabled={isDisabled || isLoading} onClick={onPress}>{startContent}{children}{endContent}</button>,
    ButtonGroup: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));
jest.mock('@/src/components/customs/heroui/custom-input', () => ({
    CustomInput: React.forwardRef(function Input({ onValueChange, classNames, startContent, ...props }: any, ref: any) {
        return <input {...props} ref={ref} onChange={event => { props.onChange?.(event); onValueChange?.(event.target.value); }} />;
    }),
}));
jest.mock('@/src/components/customs/heroui/custom-select', () => ({ CustomSelect: ({ options, selectedKeys, onChange, renderValue, classNames, ...props }: any) => <select {...props} value={selectedKeys[0]} onChange={onChange}>{Object.entries(options).map(([key, label]) => <option key={key} value={key}>{String(label)}</option>)}</select> }));
jest.mock('@/src/components/customs/heroui/custom-pagination', () => ({ CustomPagination: ({ page, onChange, total }: any) => <button onClick={() => onChange(Math.min(page + 1, total))}>Next test page</button> }));
jest.mock('@/src/components/customs/heroui/custom-table', () => ({ CustomTable: ({ columns, items, renderCell, emptyContent }: any) => items.length ? <table><tbody>{items.map((item: any) => <tr key={item.key}>{columns.map((column: any) => <td key={column.key}>{renderCell(item, column.key)}</td>)}</tr>)}</tbody></table> : <div>{emptyContent}</div> }));
jest.mock('../filter-bar', () => ({ FilterBar: () => <div>Filter controls</div> }));
jest.mock('../word-card', () => ({ WordCard: ({ name }: any) => <article>{name}</article> }));
jest.mock('../word-card-skeleton', () => ({ WordCardSkeleton: () => <div>Loading card</div> }));

beforeEach(() => {
    mockLocale = 'tr';
    mockSearchParams = new URLSearchParams();
    mockWordState = { data: [{ word_id: 1, name: 'kitap', meaning: 'Okunmak için yazılmış yapıt.' }], isFetching: false, isPending: false, isError: false, refetch: mockRetryWords };
    mockCountState = { data: 99438, isFetching: false, isError: false, refetch: mockRetryCount };
    jest.clearAllMocks();
    window.history.replaceState(null, '', '/tr/kelime-listesi');
});

test('shows localized count, accessible browsing controls and ordinary word links', () => {
    render(<WordList />);
    expect(screen.getByRole('status')).toHaveTextContent('99.438 kelime');
    expect(screen.getByRole('button', { name: 'Liste görünümü' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Kart görünümü' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Tümü' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('link', { name: 'kitap' })).not.toHaveAttribute('target');
    fireEvent.click(screen.getByRole('button', { name: 'Gelişmiş filtreler' }));
    expect(screen.getByRole('button', { name: 'Gelişmiş filtreleri gizle' })).toHaveAttribute('aria-expanded', 'true');
});

test('removes one named filter and clears the remaining search and filters', async () => {
    mockSearchParams = new URLSearchParams('search=kitap&letter=K&pos=1&lang=2&attr=3&page=3');
    render(<WordList />);
    fireEvent.click(screen.getByRole('button', { name: 'Sözcük Türü: isim filtresini kaldır' }));
    await waitFor(() => expect(mockWordsQuery).toHaveBeenLastCalledWith(expect.objectContaining({ partOfSpeechId: [], languageId: ['2'], startsWith: 'K', skip: 0 }), expect.anything()));
    fireEvent.click(screen.getByRole('button', { name: 'Filtreleri temizle' }));
    await waitFor(() => expect(mockWordsQuery).toHaveBeenLastCalledWith(expect.objectContaining({ search: '', partOfSpeechId: [], languageId: [], attributeId: [], startsWith: undefined, skip: 0 }), expect.anything()));
    expect(screen.getByRole('searchbox')).toHaveValue('');
});

test.each(['list', 'grid'])('%s empty results offer a useful way back to all words', mode => {
    mockSearchParams = new URLSearchParams(`search=missing&view=${mode}`);
    mockWordState.data = [];
    mockCountState.data = 0;
    render(<WordList />);
    expect(screen.getByText('Kelime bulunamadı')).toBeInTheDocument();
    expect(screen.getByText(tr.WordList.results.emptyFiltered)).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Filtreleri temizle' }).at(-1)!);
    expect(screen.getByRole('searchbox')).toHaveValue('');
});

test.each(['words', 'count'])('retries a failed %s request without losing the search', query => {
    mockSearchParams = new URLSearchParams('search=kitap');
    if (query === 'words') mockWordState.isError = true;
    else mockCountState.isError = true;
    render(<WordList />);
    expect(screen.getByRole('alert')).toHaveTextContent(tr.WordList.results.errorTitle);
    fireEvent.click(screen.getByRole('button', { name: 'Yeniden dene' }));
    expect(mockRetryWords).toHaveBeenCalledTimes(1);
    expect(mockRetryCount).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('searchbox')).toHaveValue('kitap');
});

test('switches views without losing the current page and resets page when changing page size', async () => {
    mockSearchParams = new URLSearchParams('page=5');
    render(<WordList />);
    fireEvent.click(screen.getByRole('button', { name: 'Kart görünümü' }));
    await waitFor(() => expect(mockWordsQuery).toHaveBeenLastCalledWith(expect.objectContaining({ skip: 40 }), expect.anything()));
    fireEvent.change(screen.getByRole('combobox', { name: 'Sayfa başına kelime' }), { target: { value: '20' } });
    await waitFor(() => expect(mockWordsQuery).toHaveBeenLastCalledWith(expect.objectContaining({ take: 20, skip: 0 }), expect.anything()));
});

test('English route uses English browsing and missing-meaning text', () => {
    mockLocale = 'en';
    mockWordState.data = [{ word_id: 1, name: 'kitap', meaning: null }];
    render(<WordList />);
    expect(screen.getByRole('button', { name: 'Browse by letter' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByText('No meaning available.')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('99,438 words');
});


test('mobile previous and next controls respect first and last pages', async () => {
    mockCountState.data = 20;
    render(<WordList />);
    expect(screen.getByRole('button', { name: tr.WordList.pagination.previous })).toBeDisabled();
    const next = screen.getByRole('button', { name: tr.WordList.pagination.next });
    fireEvent.click(next);
    await waitFor(() => expect(mockWordsQuery).toHaveBeenLastCalledWith(expect.objectContaining({ skip: 10 }), expect.anything()));
    expect(next).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: tr.WordList.pagination.previous }));
    await waitFor(() => expect(mockWordsQuery).toHaveBeenLastCalledWith(expect.objectContaining({ skip: 0 }), expect.anything()));
});

test('page jump opens the requested page and exposes the mobile numeric keyboard hint', async () => {
    mockCountState.data = 100;
    render(<WordList />);
    const input = screen.getByRole('spinbutton', { name: tr.WordList.pagination.jumpTo });
    expect(input).toHaveAttribute('inputmode', 'numeric');
    fireEvent.change(input, { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: tr.WordList.pagination.go }));
    await waitFor(() => expect(mockWordsQuery).toHaveBeenLastCalledWith(expect.objectContaining({ skip: 20 }), expect.anything()));
    expect(input).toHaveValue(3);
});

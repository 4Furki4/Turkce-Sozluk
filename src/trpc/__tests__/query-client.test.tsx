import { createQueryClient } from "../query-client";
import { toast } from "sonner";

jest.mock("superjson", () => ({ __esModule: true, default: { serialize: (json: unknown) => ({ json }), deserialize: ({ json }: { json: unknown }) => json } }));
jest.mock("sonner", () => ({ toast: { error: jest.fn(), dismiss: jest.fn() } }));
jest.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));

const throttled = Object.assign(new Error("slow down"), { data: { code: "TOO_MANY_REQUESTS" } });

afterEach(() => jest.clearAllMocks());

test("429 queries do not retry and simultaneous failures use one toast identity", async () => {
    const client = createQueryClient();
    const read = jest.fn().mockRejectedValue(throttled);
    await Promise.all(["list", "count"].map(async (key) => {
        await expect(client.fetchQuery({ queryKey: [key], queryFn: read, retryDelay: 0 })).rejects.toBe(throttled);
    }));
    expect(read).toHaveBeenCalledTimes(2);
    expect(toast.error).toHaveBeenCalledTimes(2);
    for (const [, options] of (toast.error as jest.Mock).mock.calls) {
        expect(options).toMatchObject({ id: "rate-limit" });
        expect(options.action).toBeDefined();
    }
    client.clear();
});

test("ordinary browser query failures retain their normal retry behavior", async () => {
    const client = createQueryClient();
    const read = jest.fn().mockRejectedValue(new Error("network unavailable"));
    await expect(client.fetchQuery({ queryKey: ["network"], queryFn: read, retryDelay: 0 })).rejects.toThrow("network unavailable");
    expect(read).toHaveBeenCalledTimes(4);
    expect(toast.error).not.toHaveBeenCalled();
    client.clear();
});

test("throttled writes notify without automatically replaying the mutation", async () => {
    const client = createQueryClient();
    const write = jest.fn().mockRejectedValue(throttled);
    const mutation = client.getMutationCache().build(client, { mutationFn: write });
    await expect(mutation.execute(undefined)).rejects.toBe(throttled);
    expect(write).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ id: "rate-limit", action: undefined }));
    client.clear();
});

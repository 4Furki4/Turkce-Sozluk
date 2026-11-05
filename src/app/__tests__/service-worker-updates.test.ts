/** @jest-environment node */

const mockOptions = jest.fn();
const mockCapture = jest.fn();
const mockDeleteMetadata = jest.fn().mockResolvedValue(undefined);
const mockListeners = new Map<string, (event: {
  waitUntil: (promise: Promise<unknown>) => void;
  data?: { type: string };
  ports?: { postMessage: (revision: string) => void }[];
}) => void>();
const mockBaseCacheNames = ["pages-rsc-prefetch", "pages-rsc", "pages", "next-static-js-assets"];
const mockHandlers = mockBaseCacheNames.map((cacheName) => ({ cacheName, plugins: [{ expiration: true }] }));

jest.mock("@serwist/next/worker", () => ({
  defaultCache: mockHandlers.map((handler) => ({ matcher: () => true, handler })),
  PAGES_CACHE_NAME: { rscPrefetch: "pages-rsc-prefetch", rsc: "pages-rsc", html: "pages" },
}));
jest.mock("serwist", () => ({
  Serwist: class {
    routes = new Map([["GET", []]]);
    constructor(options: unknown) { mockOptions(options); }
    registerCapture(...args: unknown[]) { mockCapture(...args); }
    addEventListeners() {}
  },
  NetworkOnly: class {},
  NavigationRoute: class {},
  CacheExpiration: class {
    constructor(private readonly cacheName: string) {}
    delete() { return mockDeleteMetadata(this.cacheName); }
  },
}));

describe("release-scoped page cache activation", () => {
  const originalSelf = Object.getOwnPropertyDescriptor(globalThis, "self");
  const originalCaches = Object.getOwnPropertyDescriptor(globalThis, "caches");

  beforeEach(() => mockHandlers.forEach((handler, index) => { handler.cacheName = mockBaseCacheNames[index]; }));

  afterEach(() => {
    mockListeners.clear();
    mockOptions.mockClear();
    mockCapture.mockClear();
    mockDeleteMetadata.mockClear();
    if (originalSelf) Object.defineProperty(globalThis, "self", originalSelf);
    else Reflect.deleteProperty(globalThis, "self");
    if (originalCaches) Object.defineProperty(globalThis, "caches", originalCaches);
    else Reflect.deleteProperty(globalThis, "caches");
  });

  it.each(["build-one", "build-two"])("preserves %s HTML and unrelated caches while deleting older documents", async (revision) => {
    const entries = [{ url: "/tr", revision }];
    Object.defineProperty(globalThis, "self", {
      configurable: true,
      value: {
        __SW_MANIFEST: entries,
        addEventListener: (type: string, listener: (event: never) => void) => mockListeners.set(type, listener),
      },
    });
    const deleteCache = jest.fn().mockResolvedValue(true);
    Object.defineProperty(globalThis, "caches", {
      configurable: true,
      value: {
        keys: jest.fn().mockResolvedValue([
          "document-pages",
          "document-pages-previous-build",
          `document-pages-${revision}`,
          "pages-rsc",
          "pages-rsc-prefetch-previous-build",
          "pages-previous-build",
          `pages-rsc-${revision}`,
          `pages-rsc-prefetch-${revision}`,
          `pages-${revision}`,
          "next-static-js-assets",
          "serwist-precache-v2",
          "offline-dictionary",
        ]),
        delete: deleteCache,
      },
    });
    jest.isolateModules(() => { require("../sw"); });
    expect(mockOptions).toHaveBeenCalledWith(expect.objectContaining({
      precacheEntries: entries,
      skipWaiting: false,
      clientsClaim: true,
    }));
    const postMessage = jest.fn();
    mockListeners.get("message")!({
      waitUntil: jest.fn(),
      data: { type: "GET_PWA_RELEASE" },
      ports: [{ postMessage }],
    });
    expect(postMessage).toHaveBeenCalledWith(revision);
    expect(mockHandlers.map((handler) => handler.cacheName)).toEqual([
      `pages-rsc-prefetch-${revision}`, `pages-rsc-${revision}`, `pages-${revision}`, "next-static-js-assets",
    ]);
    for (const handler of mockHandlers) {
      expect(mockCapture).toHaveBeenCalledWith(expect.any(Function), handler, undefined);
      expect(handler.plugins).toEqual([{ expiration: true }]);
    }
    let activation: Promise<unknown> | undefined;
    mockListeners.get("activate")!({ waitUntil: (promise) => { activation = promise; } });
    await activation;
    expect(deleteCache.mock.calls).toEqual([
      ["document-pages"], ["document-pages-previous-build"], ["pages-rsc"],
      ["pages-rsc-prefetch-previous-build"], ["pages-previous-build"],
    ]);
    expect(mockDeleteMetadata.mock.calls).toEqual([
      ["pages-rsc"], ["pages-rsc-prefetch-previous-build"], ["pages-previous-build"],
    ]);
  });
});

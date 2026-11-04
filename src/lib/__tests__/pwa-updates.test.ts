import {
  createPwaUpdateManager,
  UPDATE_ACTIVATION_TIMEOUT_MS,
  UPDATE_CHECK_INTERVAL_MS,
  UPDATE_CHECK_THROTTLE_MS,
  type PwaUpdateState,
} from "../pwa-updates";

class WorkerStub extends EventTarget {
  state: ServiceWorkerState = "installed";
}

function setup(hasController = true, pendingRegistration = false) {
  const first = new WorkerStub() as unknown as ServiceWorker;
  const next = new WorkerStub() as unknown as ServiceWorker;
  const container = { controller: hasController ? first : null } as ServiceWorkerContainer;
  const registration = Object.assign(new EventTarget(), {
    waiting: null as ServiceWorker | null,
    installing: null as ServiceWorker | null,
    update: jest.fn().mockResolvedValue(undefined),
  }) as unknown as ServiceWorkerRegistration;
  const listeners = new Map<string, Set<(event: { sw?: ServiceWorker }) => void>>();
  let resolveRegistration!: (value: ServiceWorkerRegistration) => void;
  const registrationPromise = pendingRegistration
    ? new Promise<ServiceWorkerRegistration>((resolve) => { resolveRegistration = resolve; })
    : Promise.resolve(registration);
  const client = {
    register: jest.fn(() => registrationPromise),
    messageSkipWaiting: jest.fn(),
    addEventListener: jest.fn((type, callback) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(callback);
    }),
    removeEventListener: jest.fn((type, callback) => listeners.get(type)?.delete(callback)),
  } as unknown as NonNullable<Window["serwist"]>;
  let online = true;
  const onState = jest.fn<void, [PwaUpdateState]>();
  const reload = jest.fn();
  const environment = { container, window, document, isOnline: () => online, reload };
  const manager = createPwaUpdateManager(client, onState, environment);
  const emit = (type: string, sw?: ServiceWorker) => listeners.get(type)?.forEach((callback) => callback({ sw }));
  const wait = () => {
    Object.defineProperty(registration, "waiting", { value: next, configurable: true });
    emit("waiting", next);
  };
  const control = (worker = next) => {
    Object.defineProperty(container, "controller", { value: worker, configurable: true });
    Object.defineProperty(registration, "waiting", { value: null, configurable: true });
    emit("controlling", worker);
  };
  return {
    manager, first, next, container, registration, client, onState, reload,
    environment, emit, wait, control, resolveRegistration,
    setOnline(value: boolean) { online = value; window.dispatchEvent(new Event(value ? "online" : "offline")); },
    state: () => onState.mock.calls.at(-1)![0],
  };
}

const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };

describe("PWA release update lifecycle", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
  });
  afterEach(() => jest.useRealTimers());

  it("keeps first installation and claiming quiet", async () => {
    const app = setup(false);
    await flush();
    app.control(app.first);
    expect(app.state().available).toBe(false);
    expect(app.reload).not.toHaveBeenCalled();
    expect(app.client.messageSkipWaiting).not.toHaveBeenCalled();
    app.wait();
    expect(app.state().available).toBe(true);
    app.manager.dispose();
  });

  it("detects a worker that was waiting before registration without isUpdate", async () => {
    const app = setup();
    Object.defineProperty(app.registration, "waiting", { value: app.next, configurable: true });
    await flush();
    expect(app.state().available).toBe(true);
    expect(app.reload).not.toHaveBeenCalled();
    app.manager.dispose();
  });

  it("activates only after acceptance, waits for control and reloads once", async () => {
    const app = setup();
    await flush();
    app.wait();
    expect(app.client.messageSkipWaiting).not.toHaveBeenCalled();
    app.manager.applyUpdate();
    app.manager.applyUpdate();
    expect(app.state().updating).toBe(true);
    expect(app.client.messageSkipWaiting).toHaveBeenCalledTimes(1);
    expect(app.reload).not.toHaveBeenCalled();
    app.control();
    app.emit("controlling", app.next);
    expect(app.reload).toHaveBeenCalledTimes(1);
    app.manager.dispose();
  });

  it("preserves another tab's work, then reloads directly on its acceptance", async () => {
    const app = setup();
    await flush();
    app.control();
    expect(app.state().available).toBe(true);
    expect(app.reload).not.toHaveBeenCalled();
    app.manager.applyUpdate();
    expect(app.reload).toHaveBeenCalledTimes(1);
    expect(app.client.messageSkipWaiting).not.toHaveBeenCalled();
    app.manager.dispose();
  });

  it("defers the same worker through resume and activation, but shows a distinct release", async () => {
    const app = setup();
    await flush();
    app.wait();
    app.manager.dismiss();
    app.emit("waiting", app.next);
    window.dispatchEvent(new Event("focus"));
    app.control();
    expect(app.state().available).toBe(false);
    const later = new WorkerStub() as unknown as ServiceWorker;
    app.emit("waiting", later);
    expect(app.state().available).toBe(true);
    expect(app.reload).not.toHaveBeenCalled();
    app.manager.dispose();
  });

  it("keeps a dismissed release hidden when the component remounts", async () => {
    const app = setup();
    await flush();
    app.wait();
    app.manager.dismiss();
    app.manager.dispose();

    const onState = jest.fn();
    const remount = createPwaUpdateManager(app.client, onState, app.environment);
    await flush();
    expect(onState).not.toHaveBeenCalledWith(expect.objectContaining({ available: true }));

    app.control();
    expect(onState).toHaveBeenLastCalledWith(expect.objectContaining({ available: false }));
    remount.dispose();
  });

  it("does not resurface a dismissed download when it becomes redundant", async () => {
    const app = setup();
    await flush();
    app.wait();
    app.manager.dismiss();

    Object.defineProperty(app.next, "state", { value: "redundant" });
    Object.defineProperty(app.registration, "waiting", { value: null });
    app.next.dispatchEvent(new Event("statechange"));
    expect(app.state()).toMatchObject({ available: false, error: false });
    app.manager.dispose();
  });

  it("accepts the newest waiting release after another tab activated an earlier update", async () => {
    const app = setup();
    await flush();
    app.control();
    const newest = new WorkerStub() as unknown as ServiceWorker;
    Object.defineProperty(app.registration, "waiting", { value: newest, configurable: true });
    app.emit("waiting", newest);
    app.manager.applyUpdate();
    expect(app.client.messageSkipWaiting).toHaveBeenCalledTimes(1);
    window.dispatchEvent(new Event("focus"));
    expect(app.reload).not.toHaveBeenCalled();
    app.control(newest);
    expect(app.reload).toHaveBeenCalledTimes(1);
    app.manager.dispose();
  });

  it("disables acceptance offline and allows it when connectivity returns", async () => {
    const app = setup();
    await flush();
    app.wait();
    app.setOnline(false);
    app.manager.applyUpdate();
    expect(app.state()).toMatchObject({ available: true, online: false, updating: false });
    expect(app.client.messageSkipWaiting).not.toHaveBeenCalled();
    app.setOnline(true);
    app.manager.applyUpdate();
    expect(app.client.messageSkipWaiting).toHaveBeenCalledTimes(1);
    app.manager.dispose();
  });

  it("times out, permits retry, and does not reload for a late unaccepted activation", async () => {
    const app = setup();
    await flush();
    app.wait();
    app.manager.applyUpdate();
    jest.advanceTimersByTime(UPDATE_ACTIVATION_TIMEOUT_MS);
    expect(app.state()).toMatchObject({ available: true, error: true, updating: false });
    app.control();
    expect(app.reload).not.toHaveBeenCalled();
    app.manager.applyUpdate();
    expect(app.reload).toHaveBeenCalledTimes(1);
    app.manager.dispose();
  });

  it("recovers from a redundant download and accepts a newly downloaded worker on retry", async () => {
    const app = setup();
    await flush();
    app.wait();
    app.manager.applyUpdate();
    Object.defineProperty(app.next, "state", { value: "redundant", configurable: true });
    Object.defineProperty(app.registration, "waiting", { value: null, configurable: true });
    app.next.dispatchEvent(new Event("statechange"));
    expect(app.state()).toMatchObject({ error: true, updating: false });
    app.manager.applyUpdate();
    expect(app.state()).toMatchObject({ available: true, updating: true, error: false });
    const retry = new WorkerStub() as unknown as ServiceWorker;
    Object.defineProperty(app.registration, "waiting", { value: retry, configurable: true });
    app.emit("waiting", retry);
    expect(app.client.messageSkipWaiting).toHaveBeenCalledTimes(2);
    app.control(retry);
    expect(app.reload).toHaveBeenCalledTimes(1);
    app.manager.dispose();
  });

  it("observes an asynchronous native update on retry even when Serwist stops forwarding waiting", async () => {
    const app = setup();
    await flush();
    app.wait();
    app.manager.applyUpdate();
    Object.defineProperty(app.next, "state", { value: "redundant", configurable: true });
    Object.defineProperty(app.registration, "waiting", { value: null, configurable: true });
    app.next.dispatchEvent(new Event("statechange"));
    const retry = new WorkerStub() as unknown as ServiceWorker;
    Object.defineProperty(retry, "state", { value: "installing", configurable: true });
    (app.registration.update as jest.Mock).mockImplementationOnce(async () => {
      window.setTimeout(() => {
        Object.defineProperty(app.registration, "installing", { value: retry, configurable: true });
        app.registration.dispatchEvent(new Event("updatefound"));
        window.setTimeout(() => {
          Object.defineProperty(retry, "state", { value: "installed", configurable: true });
          Object.defineProperty(app.registration, "waiting", { value: retry, configurable: true });
          retry.dispatchEvent(new Event("statechange"));
        }, 10);
      }, 10);
    });
    app.manager.applyUpdate();
    expect(app.state()).toMatchObject({ available: true, updating: true, error: false });
    jest.advanceTimersByTime(20);
    await flush();
    expect(app.client.messageSkipWaiting).toHaveBeenCalledTimes(2);
    app.control(retry);
    expect(app.reload).toHaveBeenCalledTimes(1);
    app.manager.dispose();
  });

  it("observes an already installing worker and removes native listeners on disposal", async () => {
    const app = setup();
    Object.defineProperty(app.next, "state", { value: "installing", configurable: true });
    Object.defineProperty(app.registration, "installing", { value: app.next, configurable: true });
    const removeWorker = jest.spyOn(app.next, "removeEventListener");
    const removeRegistration = jest.spyOn(app.registration, "removeEventListener");
    await flush();
    app.manager.dispose();
    expect(removeWorker).toHaveBeenCalledWith("statechange", expect.any(Function));
    expect(removeRegistration).toHaveBeenCalledWith("updatefound", expect.any(Function));
    const callCount = app.onState.mock.calls.length;
    Object.defineProperty(app.next, "state", { value: "installed", configurable: true });
    Object.defineProperty(app.registration, "waiting", { value: app.next, configurable: true });
    app.registration.dispatchEvent(new Event("updatefound"));
    app.next.dispatchEvent(new Event("statechange"));
    await flush();
    expect(app.onState).toHaveBeenCalledTimes(callCount);
    expect(app.client.messageSkipWaiting).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  it("does not mistake a natively observed first installation for an update", async () => {
    const app = setup(false);
    Object.defineProperty(app.first, "state", { value: "installing", configurable: true });
    Object.defineProperty(app.registration, "installing", { value: app.first, configurable: true });
    await flush();
    Object.defineProperty(app.first, "state", { value: "installed", configurable: true });
    Object.defineProperty(app.registration, "waiting", { value: app.first, configurable: true });
    app.first.dispatchEvent(new Event("statechange"));
    await flush();
    app.control(app.first);
    expect(app.state().available).toBe(false);
    expect(app.client.messageSkipWaiting).not.toHaveBeenCalled();
    expect(app.reload).not.toHaveBeenCalled();
    app.manager.dispose();
  });

  it("retries a transient registration failure after reconnect with throttling and no overlap", async () => {
    const app = setup();
    const registrationError = jest.spyOn(console, "error").mockImplementation(() => {});
    (app.client.register as jest.Mock).mockRejectedValueOnce(new Error("offline"));
    await flush();
    expect(app.client.register).toHaveBeenCalledTimes(1);
    expect(app.state().available).toBe(false);
    window.dispatchEvent(new Event("focus"));
    await flush();
    expect(app.client.register).toHaveBeenCalledTimes(1);
    app.setOnline(false);
    jest.advanceTimersByTime(UPDATE_CHECK_THROTTLE_MS);
    app.setOnline(true);
    window.dispatchEvent(new Event("focus"));
    await flush();
    expect(app.client.register).toHaveBeenCalledTimes(2);
    app.wait();
    expect(app.state().available).toBe(true);
    expect(app.reload).not.toHaveBeenCalled();
    app.manager.dispose();
    registrationError.mockRestore();
  });

  it("shares registration across remounts and stops callbacks/listeners while pending", async () => {
    const app = setup(true, true);
    app.manager.dispose();
    const updates = jest.fn();
    const remount = createPwaUpdateManager(app.client, updates, app.environment);
    await flush();
    expect(app.client.register).toHaveBeenCalledTimes(1);
    app.resolveRegistration(app.registration);
    await flush();
    expect(app.onState).toHaveBeenCalledTimes(1);
    app.wait();
    expect(updates.mock.calls.at(-1)![0].available).toBe(true);
    remount.dispose();
    const callCount = updates.mock.calls.length;
    app.emit("controlling", app.next);
    window.dispatchEvent(new Event("focus"));
    jest.advanceTimersByTime(UPDATE_CHECK_INTERVAL_MS);
    expect(updates).toHaveBeenCalledTimes(callCount);
    expect(jest.getTimerCount()).toBe(0);
  });

  it("detects an update activated while its component was unmounted", async () => {
    const app = setup();
    await flush();
    app.manager.dispose();
    app.control();
    const updates = jest.fn();
    const remount = createPwaUpdateManager(app.client, updates, app.environment);
    await flush();
    expect(updates.mock.calls.at(-1)![0].available).toBe(true);
    expect(app.reload).not.toHaveBeenCalled();
    remount.applyUpdate();
    expect(app.reload).toHaveBeenCalledTimes(1);
    remount.dispose();
  });

  it("throttles visible online checks, skips hidden/offline checks and avoids overlap", async () => {
    const app = setup();
    await flush();
    expect(app.registration.update).toHaveBeenCalledTimes(1);
    window.dispatchEvent(new Event("focus"));
    expect(app.registration.update).toHaveBeenCalledTimes(1);
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    jest.advanceTimersByTime(UPDATE_CHECK_INTERVAL_MS);
    expect(app.registration.update).toHaveBeenCalledTimes(1);
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    app.setOnline(false);
    jest.advanceTimersByTime(UPDATE_CHECK_INTERVAL_MS);
    expect(app.registration.update).toHaveBeenCalledTimes(1);
    let finish!: () => void;
    (app.registration.update as jest.Mock).mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve; }));
    app.setOnline(true);
    expect(app.registration.update).toHaveBeenCalledTimes(2);
    jest.advanceTimersByTime(UPDATE_CHECK_THROTTLE_MS);
    window.dispatchEvent(new Event("focus"));
    expect(app.registration.update).toHaveBeenCalledTimes(2);
    finish();
    await flush();
    window.dispatchEvent(new Event("focus"));
    expect(app.registration.update).toHaveBeenCalledTimes(3);
    app.manager.dispose();
  });
});

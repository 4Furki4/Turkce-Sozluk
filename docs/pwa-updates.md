# App updates

Production builds include a service worker. When a newer deployed build finishes
downloading, the app offers **Update now** and **Later** in Turkish or English.
The app checks on registration, focus, resumed visibility and reconnection, and
every ten minutes while visible and online. Checks are limited to once per minute
and cannot overlap. Local development keeps the service worker disabled.
Transient registration failures also retry during a visible online resume,
subject to the same one-minute throttle. Native registration and installing-worker
listeners keep later downloads detectable even if Serwist stops forwarding an
external worker's lifecycle events.

**Update now** activates the downloaded worker and reloads the current URL,
including its query and hash, once the replacement controls this tab. Users should
save unfinished forms first. Other open tabs keep their page and offer their own
explicit reload. **Later** remembers the deferred release across reloads and
reopens when browser storage is available. A distinct release can still be
offered. Older workers that cannot report a release ID are deferred for the
current page. Updates require connectivity.
An activation that does not complete within 30 seconds shows a retry action.

Release detection uses the generated service worker bytes, rather than the
package version or a manually maintained release number. Each production build
injects a new revision for the `/tr` precache entry. The document cache includes
that revision. The default HTML, RSC and RSC-prefetch page caches use the same
revision, so an accepted update cannot reuse old page payloads while offline.
Online document navigations fetch current HTML before consulting cached pages,
including reloads that WebKit presents to the worker as ordinary navigations.
Activation deletes only older `document-pages`, `pages`, `pages-rsc` and
`pages-rsc-prefetch` cache families and their Serwist expiration records. Offline
dictionary IndexedDB data, local preferences and unrelated asset caches remain.
The dictionary and games root layouts both register the update component.

`/sw.js` is served with `Cache-Control: no-store`. Keep this exact path out of
any Cloudflare Cache Rule that overrides origin cache headers. After deploying
the header change, purge the existing `/sw.js` URL from Cloudflare for each
public hostname and verify that subsequent requests return the current script
without a cache hit.

The first deployment of this feature cannot add a prompt to JavaScript already
running from an older release. Those clients acquire update notifications after
they next load the release containing this feature. Subsequent releases can be
offered while the app stays open. First-time service worker installation remains
quiet and does not reload the page.

## Validation

Run `bun run test -- --runInBand` and `bun run build`. Use a production build on
HTTPS or loopback for browser checks; `bun run dev` deliberately does not provide
service worker behavior.

1. Open the production app in two tabs. The initial worker should claim both
   without an update prompt or reload.
2. Serve a second production build on the same origin. Return focus to a tab, or
   call `navigator.serviceWorker.getRegistration().then(reg => reg.update())`
   in browser developer tools. Wait for the worker to finish installing.
3. Confirm both tabs offer the localized prompt. Choose Later in one tab; its
   page should remain unchanged. Test offline mode and the disabled update action.
4. Accept the update in the other tab. Its controller should change and its
   current URL should reload once. The deferred tab must retain its current page.
5. Confirm the updated HTML and JavaScript belong to the second build. Inspect
   Cache Storage for removal of previous document caches, and confirm the offline
   dictionary database is still present and usable.
6. Check Turkish and English at mobile and desktop widths, keyboard access,
   button alignment and the prompt's position above mobile navigation. Disable
   motion and confirm all content stays visible.

The focused lifecycle tests cover waiting-before-registration, first install,
explicit acceptance, other-tab activation, deferral, offline behavior, failure,
retry, polling throttling and unmount cleanup. Production browser verification
is also required because mocks cannot prove actual worker activation or fresh
document delivery.

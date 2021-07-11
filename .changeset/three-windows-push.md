---
'@sveltejs/kit': patch
---

Generate service worker registration code even with `router` and `hydration` disabled

Remove service worker registration code from `start.js`, and instead inject it
in the HTML `<head>`, removing the `VITE_SVELTEKIT_SERVICE_WORKER` environment
variable definition in the process.

Service worker registration code is now always included in the HTML response, if
the specified `config.kit.files.serviceWorker` or the default
`src/service-worker.js` file exists, and decoupled from the Rollup-generated
client-side JS bundle.

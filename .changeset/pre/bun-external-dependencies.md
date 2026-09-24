---
'@sveltejs/adapter-bun': major
---

breaking: build the server with Vite instead of a second `Bun.build` pass, keeping production dependencies external; `buildOptions` now only applies to executables

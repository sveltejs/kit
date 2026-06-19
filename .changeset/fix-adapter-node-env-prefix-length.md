---
'@sveltejs/adapter-node': patch
---

fix: restore `envPrefix` behaviour in adapter-node by splitting the build-time replacement of `ENV_PREFIX.length` into a separate `ENV_PREFIX_LENGTH` token

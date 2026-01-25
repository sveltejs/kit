---
'@sveltejs/adapter-netlify': minor
---

chore!: Migrate to the modern Netlify Functions API

The Netlify adapter now generates "v2" Netlify Functions, which uses modern standards (ESM, Request,
Response) instead of the legacy "Lambda-compatible" or "v1" format. Under the hood, this greatly
simplifies the adapter code and improves maintainability.

For more details on features this unlocks for your SvelteKit app, see
https://developers.netlify.com/guides/migrating-to-the-modern-netlify-functions/.

BREAKING CHANGES:

- `platform.context` is now the [modern Netlify Functions
  context](https://docs.netlify.com/build/functions/api/#netlify-specific-context-object)

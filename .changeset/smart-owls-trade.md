---
'@sveltejs/adapter-cloudflare-workers': major
---

feat: use the new Workers Static Assets feature from Cloudflare

This changes the adapter to stop using the old Workers Sites (kv-asset-handler) approach in favor of the new Workers Static Assets feature, which is embedded into Cloudflare natively.

Also, this change removes the extra esbuild step that was being run inside the adapter, instead relying upon Wrangler to do the bundling.

## Breaking changes and migration

- This version of the adapter requires Wrangler version 3.87.0 or later.

  Run `npm add -D wrangler@latest` (or similar) in your project to update Wrangler.

- The user's Wrangler configuration (`wrangler.toml`) must be migrated from using Workers Sites to using Workers Assets.

For reference, see the previous [Workers Sites documentation](https://developers.cloudflare.com/workers/configuration/sites/configuration/) and the new [Workers Assets documentation](NEW_DOC_URL).

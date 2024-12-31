---
'@sveltejs/adapter-cloudflare-workers': major
---

feat: use the new Workers Static Assets feature from Cloudflare

This changes the adapter to stop using the old Workers Sites (kv-asset-handler) approach.
Instead, making use of the new Workers Static Assets feature, which is embedded into Cloudflare natively.

Also this change removes the extra esbuild step that was being run inside the adapter, relying upon Wrangler to do the bundling.
The extra esbuild step required a hardcoded list of Node.js compatible modules.
This is no longer needed since Wrangler now manages all of that.

## Breaking changes and migration

- This version of the adapter requires Wrangler version 3.87.0 or later.

  Run `npm add -D wrangler@latest` (or similar) in your project to update Wrangler.
- The user's Wrangler configuration (`wrangler.toml`) must be migrated from using Workers Sites to using Workers Assets.

  Previously a user's `wrangler.toml` might look like:

  ```toml
  name = "<your-site-name>"
  account_id = "<your-account-id>"
  compatibility_date = "2021-11-12"
  main = "./.cloudflare/worker.js"

  # Workers Sites configuration
  site.bucket = "./.cloudflare/public"
  ```

  Change it to to look like:

  ```toml
  name = "<your-site-name>"
  account_id = "<your-account-id>"
  compatibility_date = "2021-11-12"`
  main = ".svelte-kit/cloudflare/server/index.js"

  # Workers Assets configuration
  assets = { directory = ".svelte-kit/cloudflare/client" }
  ```

- Workers Assets defaults to serving assets directly for a matching request, rather than routing it through the Worker code.
  
  The previous adapter would add custom headers to assets responses (such as `cache-control`, `content-type`, and `x-robots-tag`. Such direct asset responses no longer contain these headers - but the will include eTag headers that have proven (in Pages) to be an effective caching strategy for assets.
  
  If you wish to always run the Worker before every request then add `serve_directly = false` to the assets configuration section. For example:

  ```toml
  assets = { directory = ".svelte-kit/cloudflare/client", serve_directly = false }
  ```

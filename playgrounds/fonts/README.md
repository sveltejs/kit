# Fonts playground

Experimental SvelteKit app for [`@sveltejs/enhanced-fonts`](../../packages/enhanced-fonts). One app, swap adapters — not a demo per adapter. This package is **not published to npm**.

Styling is **Svelte `<style>` blocks** with `font-family: var(--font-*)` only. There is no Tailwind (or other utility CSS framework). Custom properties are declared on `:root` by `<Font>` (unscoped head CSS) and inherit into scoped component styles.

## Run

From the repo root (after `pnpm install --frozen-lockfile`):

```bash
pnpm --filter playground-fonts dev
```

Then open the printed local URL. Production-shaped output:

```bash
pnpm --filter playground-fonts build
pnpm --filter playground-fonts preview
```

`build` downloads Inter, Fraunces, and Lora from Google (via unifont) and copies the Fontsource woff2 into hashed client assets. Visitors never hit `fonts.googleapis.com` / `fonts.gstatic.com`.

## Adapter

Default is `@sveltejs/adapter-static` (prerender every route). To serve with Node instead, in `vite.config.js`:

1. Comment out `import adapter from '@sveltejs/adapter-static'`.
2. Uncomment `import adapter from '@sveltejs/adapter-node'`.
3. Rebuild.

`@sveltejs/adapter-node` is already a workspace dependency so the swap is import-only.

## Three-route matrix + never-preloaded 4th family

Default **preload stays off**. Shared family **A** is Inter (`--font-inter`, Google, `font-display: swap`) — preloaded **only on `/`**. Family **B** is Fraunces (`--font-home`) on `/` only, never preloaded. Family **C** is Libre Barcode 128 Text (`--font-display`, Fontsource via `local`) on `/display` only, never preloaded. Family **D** is Lora (`--font-serif`) on `/about` — **used** there via `var(--font-serif)` and **never** gets `<link rel="preload" as="font">` on any route.

Assert **HTML** (`@font-face` / `<link rel="preload" as="font">`), not “the network downloaded it.”

|                                    | `/`     | `/about` | `/display` |
| ---------------------------------- | ------- | -------- | ---------- |
| `@font-face` / CSS for Inter       | yes     | yes      | yes        |
| `<link rel=preload as=font>` Inter | **yes** | **no**   | **no**     |
| CSS for Fraunces                   | yes     | no       | no         |
| preload Fraunces                   | **no**  | never    | never      |
| CSS for Lora (family D)            | no      | yes      | no         |
| preload Lora                       | never   | **no**   | never      |
| CSS for Libre Barcode              | no      | no       | yes        |
| preload Libre Barcode              | never   | never    | **no**     |

Do not move Inter’s preload into root `+layout.svelte` / `app.html`.

## Takedown

This playground self-hosts Google and Fontsource files for a local experiment. There is **no legal sign-off**. If Google, Fontsource, or another provider complains about the demo, **take it down** (stop hosting the built site and remove the offending family from `vite.config.js`). Do not treat this README as permission to redistribute font files.

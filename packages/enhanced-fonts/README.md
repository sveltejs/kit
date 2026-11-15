# `@sveltejs/enhanced-fonts`

A Vite plugin that self-hosts fonts from an Astro-style `families` list and a `<Font>` helper.

**WARNING**: This package is experimental. It may introduce breaking changes with every minor version release.

Place the plugin **after** `sveltekit()`:

```js
import { sveltekit } from '@sveltejs/kit/vite';
import { enhancedFonts } from '@sveltejs/enhanced-fonts';

export default {
  plugins: [
    sveltekit(),
    enhancedFonts({
      families: [
        {
          name: 'Inter',
          cssVariable: '--font-inter',
          provider: 'google',
          weights: ['400', '600']
        }
      ]
    })
  ]
};
```

Apply the family with `font-family: var(--font-inter)` in CSS. Inject `@font-face` (and optional preload) from a layout or page:

```svelte
<script>
  import Font from '@sveltejs/enhanced-fonts/Font.svelte';
</script>

<Font cssVariable="--font-inter" />
```

Preload is **off** by default. Pass `preload` only on the document that should hint the font. CSS custom properties must use the `--font-*` prefix. Default `font-display` is `swap`.

## ESLint

This package ships rules as `@sveltejs/enhanced-fonts/eslint` (not a separate npm name). Install `eslint`, `eslint-plugin-svelte`, and `svelte-eslint-parser` as peers, then enable the recommended flat config:

```js
import svelte from 'eslint-plugin-svelte';
import svelteParser from 'svelte-eslint-parser';
import enhancedFonts from '@sveltejs/enhanced-fonts/eslint';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...svelte.configs.recommended,
  {
    files: ['**/*.svelte', '**/app.html'],
    languageOptions: {
      parser: svelteParser
    }
  },
  ...enhancedFonts.configs.recommended
];
```

`eslint-plugin-svelte` already parses `.svelte` files. The extra `app.html` block is so leftover Google CDN `<link>` tags in the HTML shell are visible to the same parser.

| Rule                                           | What it flags                                                                                                                                                                                                                                                      |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@sveltejs/enhanced-fonts/no-google-fonts-cdn` | `<link href>` and `@import` to `fonts.googleapis.com` or `fonts.gstatic.com` in `.svelte` and `app.html`. Self-hosted `.woff2`, comments, `@import` text inside a CSS string, Bunny, and Fontshare are allowed. Comments between `@import` and the URL still flag. |
| `@sveltejs/enhanced-fonts/no-duplicate-font`   | Two enhanced-fonts `<Font>` tags in one file with the same literal `cssVariable` (including import aliases). Different variables are fine. `cssVariable={x}` and unrelated `Font` components are skipped. Cross-file duplicates are out of scope.                  |
| `@sveltejs/enhanced-fonts/css-variable-prefix` | Literal `cssVariable` on an enhanced-fonts `<Font>` (including aliases) that is not `--font-*`. Unrelated components named `Font` are skipped.                                                                                                                     |

These rules are a static check for leftover CDN links and in-file `<Font>` mistakes. Unknown `cssVariable` values still fail at build/SSR.

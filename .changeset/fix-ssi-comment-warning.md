---
"@sveltejs/kit": patch
---

fix: don't warn about removed SSI comments in `transformPageChunk`

Server-side include (SSI) directives like `<!--#include virtual="..." -->` are HTML comments that are replaced by servers such as nginx. Previously, removing them in `transformPageChunk` would trigger a false positive warning about breaking Svelte's hydration. Since SSI comments always start with `<!--#` and Svelte's hydration comments never do, they can be safely excluded from the check.

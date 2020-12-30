---
question: Should I use Webpack or Rollup with Sapper?
---

Sapper offers both Rollup and Webpack templates. If you don't have a strong reason to prefer one over the other, we'd recommend using the Rollup template. The Rollup implementation supports additional features such as improved tree-shaking for smaller bundles, TypeScript, the ability to [serve a legacy bundle to older browsers](../docs#Browser_support), and it automatically lists all your `.js` and `.css` files in the [`Link` header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Link) to [preload](https://developer.mozilla.org/en-US/docs/Web/HTML/Link_types/preload) those files.

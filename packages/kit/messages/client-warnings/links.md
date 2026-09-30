## link_option_invalid

> Unexpected value for %name% — should be one of %options%

The value of a [link option](https://svelte.dev/docs/kit/link-options) attribute such as `data-sveltekit-preload-data` isn't one that SvelteKit recognises, so it's ignored. The element is logged alongside this warning. Use one of the listed values, or `"false"` to [disable the option](https://svelte.dev/docs/kit/link-options#Disabling-options) for this element and its children.

## link_option_replaced

> `data-sveltekit-%name%="true"` has been replaced with `data-sveltekit-reset="false"`

The `data-sveltekit-keepfocus` and `data-sveltekit-noscroll` [link options](https://svelte.dev/docs/kit/link-options) have been combined into [`data-sveltekit-reset`](https://svelte.dev/docs/kit/link-options#data-sveltekit-reset). Replace them with `data-sveltekit-reset="false"`, which preserves both the scroll position and the focused element. The element is logged alongside this warning.

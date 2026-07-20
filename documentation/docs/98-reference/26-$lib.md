---
title: '#lib'
---

When scaffolding a new SvelteKit project through the [`sv` CLI](/docs/cli/overview), it automatically creates a `#lib` import alias for your `src/lib` directory, by adding the following to your `package.json`:

```json
{
	"imports": {
		"#lib": "./src/lib/index.js",
		"#lib/*": "./src/lib/*"
	}
}
```

The `#` prefix leverages Node's built-in [subpath imports](https://nodejs.org/api/packages.html#subpath-imports) feature, which reserves `#` for package-internal aliases. Vite and TypeScript both resolve these natively.

> [!LEGACY]
> Previously, this alias was `$lib` and was automatically configured by SvelteKit. It is now `#lib` and must be declared in your `package.json` `imports` field. `import { foo } from '$lib/foo.js'` becomes `import { foo } from '#lib/foo.js'`.

```svelte
<!--- file: src/lib/Component.svelte --->
A reusable component
```

```svelte
<!--- file: src/routes/+page.svelte --->
<script>
	import Component from '#lib/Component.svelte';
</script>

<Component />
```

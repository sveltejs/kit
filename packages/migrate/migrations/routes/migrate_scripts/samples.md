## No module context, no page exports

```svelte before
<script>
	let hello = 'world';
<script>

<p>{hello}</p>
```

```svelte after
<script>
	let hello = 'world';
<script>

<p>{hello}</p>
```

## Module context on error page

```svelte before
<script context="module">
	export function load() {
		return {
			props: {
				sry: 'not anymore'
			}
		}
	}
</script>

<script>
	export let sry;
</script>

<p>{sry}</p>
```

```svelte after
<script context="module">
	throw new Error("@migration task: Replace error load function (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3293209)");

	// export function load() {
	// 	return {
	// 		props: {
	// 			sry: 'not anymore'
	// 		}
	// 	}
	// }
</script>

<script>
	export let sry;
</script>

<p>{sry}</p>
```

## Module context that can be removed

```svelte before
<script context="module">
	export function load() {
		return {
			props: {
				a: 1
			}
		}
	}
</script>

<script>
	export let a;
</script>
```

```svelte after
<script>
	throw new Error("@migration task: Add data prop (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292707)");

	export let a;
</script>
```

## Module context with moved imports

```svelte before
<script context="module">
	import Foo from './Foo.svelte';
	export function load() {
		return {
			props: {
				sry: 'not anymore'
			}
		}
	}
</script>

<script>
	export let sry;
</script>

<Foo>{sry}</Foo>
```

```svelte after
<script context="module">
	throw new Error("@migration task: Check code was safely removed (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292722)");

	// import Foo from '../Foo.svelte';
	// export function load() {
	// 	return {
	// 		props: {
	// 			sry: 'not anymore'
	// 		}
	// 	}
	// }
</script>

<script>
	throw new Error("@migration task: Add data prop (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292707)");

	export let sry;
</script>

<Foo>{sry}</Foo>
```

## Module context with type imports only

```svelte before
<script context="module">
	import type { Load, LoadEvent, LoadOutput } from '@sveltejs/kit';
	export function load() {
		return {
			props: {
				sry: 'not anymore'
			}
		}
	}
</script>
```

```svelte after
```

## Module context with type imports only but used in instance script

```svelte before
<script context="module">
	import type { Load, LoadEvent, LoadOutput } from '@sveltejs/kit';
	export function load() {
		return {
			props: {
				sry: 'not anymore'
			}
		}
	}
</script>

<script>
	const whywouldyoudothis: Load = 'I dont know lol';
</script>
```

```svelte after
<script context="module">
	throw new Error("@migration task: Check code was safely removed (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292722)");

	// import type { Load, LoadEvent, LoadOutput } from '@sveltejs/kit';
	// export function load() {
	// 	return {
	// 		props: {
	// 			sry: 'not anymore'
	// 		}
	// 	}
	// }
</script>

<script>
	const whywouldyoudothis: Load = 'I dont know lol';
</script>
```

## Module context with export * from '..'

```svelte before
<script context="module">
	export * from './somewhere';
</script>
```

```svelte after
<script context="module">
	throw new Error("@migration task: Check code was safely removed (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292722)");

	// export * from './somewhere';
</script>
```

## Module context with named imports

```svelte before
<script context="module">
	import { bar } from './somewhere';
</script>

<script>
	let foo = bar;
</script>
```

```svelte after
<script context="module">
	throw new Error("@migration task: Check code was safely removed (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292722)");

	// import { bar } from './somewhere';
</script>

<script>
	let foo = bar;
</script>
```

## Module context with named imports that have same name as a load option

```svelte before
<script context="module">
	import { router } from './somewhere';
</script>

<script>
	let foo = router;
</script>
```

```svelte after
<script context="module">
	throw new Error("@migration task: Check code was safely removed (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292722)");

	// import { router } from './somewhere';
</script>

<script>
	let foo = router;
</script>
```

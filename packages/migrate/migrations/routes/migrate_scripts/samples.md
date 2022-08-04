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

// 	export function load() {
// 		return {
// 			props: {
// 				sry: 'not anymore'
// 			}
// 		}
// 	}
</script>

<script>
	export let sry;
</script>

<p>{sry}</p>
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
<!--
@migration task: Check for missing imports and code that should be moved back to the module context (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292722)

The following imports were found:
import Foo from '../Foo.svelte';
-->

<script>
	throw new Error("@migration task: Add data prop (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292707)");

	export let sry;
</script>

<Foo>{sry}</Foo>
```

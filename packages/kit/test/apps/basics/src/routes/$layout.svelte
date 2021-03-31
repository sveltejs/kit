<script context="module">
	export async function load() {
		return {
			props: {
				foo: {
					bar: 'Custom layout'
				}
			}
		};
	}
</script>

<script>
	import { goto, prefetch, prefetchRoutes } from '$app/navigation';

	if (typeof window !== 'undefined') {
		Object.assign(window, { goto, prefetch, prefetchRoutes });
	}

	export let foo;
</script>

<slot></slot>

<footer>{foo.bar}</footer>

<style>
	footer {
		color: purple;
	}
</style>
<script context="module">
	import { browser } from '$app/env';

	/** @type {import('@sveltejs/kit').Load} */
	export async function load() {
		return {
			props: {
				foo: {
					bar: 'Custom layout'
				}
			}
		};
	}

	if (browser) {
		let h3 = document.createElement('h3');
		let text = document.createTextNode('You cannot reset me');
		h3.appendChild(text);
		document.getElementById('nested-layout-reset-test')?.appendChild(h3);
	}
</script>

<script>
	import { goto, invalidate, prefetch, prefetchRoutes } from '$app/navigation';

	if (typeof window !== 'undefined') {
		Object.assign(window, { goto, invalidate, prefetch, prefetchRoutes });
	}

	/** @type {{ bar: string }} */
	export let foo;
</script>

<slot></slot>

<footer>{foo.bar}</footer>

<style>
	footer {
		color: purple;
	}
</style>

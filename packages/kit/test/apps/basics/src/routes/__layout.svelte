<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ fetch, url }) {
		if (url.pathname.startsWith('/errors/error-in-layout')) {
			const res = await fetch('/errors/error-in-layout/non-existent');

			return {
				status: res.status
			};
		}

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
	import {
		goto,
		invalidate,
		prefetch,
		prefetchRoutes,
		beforeNavigate,
		afterNavigate
	} from '$app/navigation';

	if (typeof window !== 'undefined') {
		Object.assign(window, {
			goto,
			invalidate,
			prefetch,
			prefetchRoutes,
			beforeNavigate,
			afterNavigate
		});
	}

	/** @type {{ bar: string }} */
	export let foo;
</script>

<slot />

<footer>{foo.bar}</footer>

<style>
	footer {
		color: purple;
	}
</style>

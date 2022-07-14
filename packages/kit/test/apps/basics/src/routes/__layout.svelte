<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ fetch, url, status }) {
		if (url.pathname.startsWith('/errors/error-in-layout')) {
			const res = await fetch('/errors/error-in-layout/non-existent');

			return {
				status: res.status
			};
		}

		if (url.pathname === '/errors/status-in-layout' && !status) {
			console.log('returning 500');

			return {
				status: 500,
				error: new Error('status is accessible in __layout')
			};
		}

		return {
			props: {
				status,
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

	/** @type {number} */
	export let status;
</script>

<slot />

<p id="status">layout status: {status}</p>
<footer>{foo.bar}</footer>

<style>
	footer {
		color: purple;
	}
</style>

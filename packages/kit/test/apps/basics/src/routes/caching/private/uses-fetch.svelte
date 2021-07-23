<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ page, fetch }) {
		const res = await fetch('/caching/private/uses-fetch.json', {
			// @ts-expect-error
			credentials: page.query.get('credentials')
		});

		return {
			maxage: 30,
			props: await res.json()
		};
	}
</script>

<h1>this page will be cached for 30 seconds</h1>

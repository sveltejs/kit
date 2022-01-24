<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ fetch }) {
		const url = `/fetch-endpoint.json`;
		const res = await fetch(url);
		const { test } = await res.json();

		if (res.ok) {
			return {
				props: { test }
			};
		}

		return {
			status: res.status,
			error: new Error(`Could not load ${url}`)
		};
	}
</script>

<script>
	export let test = '';
</script>

<p>
	this is a {test} to make sure prerendering doesn't fail when fetching and inlining an endpoint
</p>

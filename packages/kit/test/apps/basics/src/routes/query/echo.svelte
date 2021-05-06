<script context="module">
	/** @typedef {Record<string, string[]>} Query */

	/** @param {URLSearchParams} query */
	function to_pojo(query) {
		/** @type {Query}*/
		const values = {};

		query.forEach((value, key) => {
			if (!(key in values)) values[key] = [];
			values[key].push(value);
		});

		return values;
	}

	/** @type {import('@sveltejs/kit').Load} */
	export function load({ page }) {
		return {
			props: {
				values: to_pojo(page.query)
			}
		};
	}
</script>

<script>
	import { page } from '$app/stores';

	/** @type {Query}*/
	export let values;
</script>

<pre id="one">{JSON.stringify(values)}</pre>
<pre id="two">{JSON.stringify(to_pojo($page.query))}</pre>

<a href="/query/echo?bar=2">?bar=2</a>

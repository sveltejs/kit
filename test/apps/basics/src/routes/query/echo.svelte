<script context="module">
	function to_pojo(query) {
		const values = {};

		query.forEach((value, key) => {
			if (key in values) {
				if (!Array.isArray(values[key])) {
					values[key] = [values[key]];
				}

				values[key].push(value);
			} else {
				values[key] = value;
			}
		});

		return values;
	}

	export function preload(page) {
		return {
			values: to_pojo(page.query)
		};
	}
</script>

<script>
	import { page } from '$app/stores';

	export let values;
</script>

<pre id="one">{JSON.stringify(values)}</pre>
<pre id="two">{JSON.stringify(to_pojo($page.query))}</pre>
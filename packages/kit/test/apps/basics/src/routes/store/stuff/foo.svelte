<script context="module">
	let is_first = true;

	export function load() {
		if (is_first) {
			is_first = false;
			throw new Error('uh oh');
		}

		return {
			stuff: {
				foo: true
			},
			props: {
				number: 2
			}
		};
	}
</script>

<script>
	export let number;
</script>

<h1>stuff - foo</h1>
<p>Number prop: {number}</p>
<a href="/store">store</a>

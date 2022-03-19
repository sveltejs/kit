<script context="module">
	let isFirst = true;

	export function load() {
		if (isFirst) {
			isFirst = false;
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
